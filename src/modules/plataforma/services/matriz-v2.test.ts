import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import {
  adicionarSuperAdmin,
  criarOficinaCompleta,
  detalheOficina,
  removerSuperAdmin,
  salvarRecursoOficina,
} from "./matriz-service";
import { planoPermite } from "./plano-service";

/**
 * Onda E (Matriz v2): criação completa de oficina pela Matriz, feature flags
 * por oficina (override do plano) e gestão de super admins.
 */

const sufixo = randomUUID().slice(0, 8);
const emailDono = `dono-e2e-${sufixo}@teste.oficinapro.com.br`;
const emailAdmin = `admin-e2e-${sufixo}@teste.oficinapro.com.br`;
let planoId = "";
let oficinaCriadaId = "";
let donoId = "";
let adminUserId = "";

beforeAll(async () => {
  const plano = await prisma.plano.create({
    data: {
      nome: `PlanoE2E-${sufixo}`,
      precoMensal: 300,
      recursos: { create: [{ chave: "ia_enabled", valor: "false" }] },
    },
  });
  planoId = plano.id;
  // Usuário dono pré-existente (evita depender do signUp do Better Auth no teste).
  const dono = await prisma.user.create({
    data: {
      id: `dono-${sufixo}`,
      name: "Dono E2E",
      email: emailDono,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  donoId = dono.id;
});

afterAll(async () => {
  if (oficinaCriadaId) {
    await prisma.organization.deleteMany({ where: { id: oficinaCriadaId } });
  }
  await prisma.plataformaAdmin.deleteMany({ where: { userId: adminUserId } });
  await prisma.user.deleteMany({ where: { email: { in: [emailDono, emailAdmin] } } });
  await prisma.plano.deleteMany({ where: { id: planoId } });
  await prisma.$disconnect();
});

describe("criarOficinaCompleta", () => {
  it("cria org + config + perfis RBAC + dono Proprietário + assinatura + flags", async () => {
    const resultado = await criarOficinaCompleta({
      nome: `Oficina E2E ${sufixo}`,
      emailDono,
      cnpj: "00.000.000/0001-00",
      responsavelNome: "Dono E2E",
      planoId,
      vencimento: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      statusInicial: "ATIVO",
      maxUsers: 5,
      iaEnabled: true,
    });
    oficinaCriadaId = resultado.oficinaId;
    // Dono já existia → sem senha provisória.
    expect(resultado.senhaProvisoria).toBeNull();
    expect(resultado.donoId).toBe(donoId);

    const [org, config, perfis, funcionario, assinatura, flags] = await Promise.all([
      prisma.organization.findUnique({ where: { id: resultado.oficinaId } }),
      prisma.oficinaConfig.findUnique({ where: { oficinaId: resultado.oficinaId } }),
      prisma.perfilAcesso.count({ where: { oficinaId: resultado.oficinaId } }),
      prisma.funcionarioPerfil.findFirst({
        where: { oficinaId: resultado.oficinaId, userId: donoId },
        include: { perfilAcesso: { select: { chave: true } } },
      }),
      prisma.assinatura.findUnique({ where: { oficinaId: resultado.oficinaId } }),
      prisma.recursoOficina.findMany({ where: { oficinaId: resultado.oficinaId } }),
    ]);
    expect(org?.name).toContain("Oficina E2E");
    expect(config?.cnpj).toBe("00.000.000/0001-00");
    expect(perfis).toBe(7);
    expect(funcionario?.perfilAcesso?.chave).toBe("PROPRIETARIO");
    expect(assinatura?.status).toBe("ATIVO");
    const chaves = new Map(flags.map((f) => [f.chave, f.valor]));
    expect(chaves.get("max_users")).toBe("5");
    expect(chaves.get("ia_enabled")).toBe("true");
  });

  it("override da oficina vence o recurso do plano (ia false no plano, true na oficina)", async () => {
    // Única consulta p/ este oficinaId — evita interferência do React cache.
    expect(await planoPermite(oficinaCriadaId, "ia_enabled")).toBe(true);
  });

  it("detalheOficina traz métricas e flags", async () => {
    const detalhe = await detalheOficina(oficinaCriadaId);
    expect(detalhe).not.toBeNull();
    expect(detalhe!.metricas.usuarios).toBe(1);
    expect(detalhe!.flags.length).toBeGreaterThanOrEqual(2);
  });
});

describe("super admins", () => {
  it("adiciona por e-mail e bloqueia remoções perigosas", async () => {
    await prisma.user.create({
      data: {
        id: `admin-${sufixo}`,
        name: "Admin E2E",
        email: emailAdmin,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const admin = await adicionarSuperAdmin(emailAdmin);
    adminUserId = admin.userId;

    // Duplicado é rejeitado.
    await expect(adicionarSuperAdmin(emailAdmin)).rejects.toThrow(/já é administradora/i);
    // E-mail sem conta é rejeitado.
    await expect(adicionarSuperAdmin(`nao-existe-${sufixo}@x.com`)).rejects.toThrow(
      /se cadastrar/i
    );
    // Ninguém remove a si mesmo.
    await expect(removerSuperAdmin(adminUserId, adminUserId)).rejects.toThrow(
      /si mesmo/i
    );
    // Remoção normal funciona (sobra o admin original da plataforma).
    await removerSuperAdmin(adminUserId, "outro-executor");
    const aindaExiste = await prisma.plataformaAdmin.findUnique({
      where: { userId: adminUserId },
    });
    expect(aindaExiste).toBeNull();
  });
});
