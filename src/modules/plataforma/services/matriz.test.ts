import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import {
  criarAssinatura,
  renovarAssinatura,
  statusEfetivo,
} from "./matriz-service";
import { limitePlano, planoPermite } from "./plano-service";

/**
 * Matriz: ciclo de assinatura (criar, bloqueio por vencimento, renovação) e
 * feature-gating por plano.
 */

const oficinaId = `test-matriz-${randomUUID().slice(0, 8)}`;
const semPlanoId = `test-matriz-sp-${randomUUID().slice(0, 8)}`;
let planoStarterId = "";

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      { id: oficinaId, name: "Oficina Matriz", slug: oficinaId, createdAt: new Date() },
      { id: semPlanoId, name: "Oficina Sem Plano", slug: semPlanoId, createdAt: new Date() },
    ],
  });
  const plano = await prisma.plano.create({
    data: {
      nome: `Starter-teste-${randomUUID().slice(0, 6)}`,
      precoMensal: 99,
      recursos: {
        create: [
          { chave: "max_users", valor: "3" },
          { chave: "ia_enabled", valor: "false" },
          { chave: "bi_enabled", valor: "true" },
        ],
      },
    },
  });
  planoStarterId = plano.id;
});

afterAll(async () => {
  await prisma.assinatura.deleteMany({ where: { oficinaId: { in: [oficinaId, semPlanoId] } } });
  await prisma.plano.deleteMany({ where: { id: planoStarterId } });
  await prisma.organization.deleteMany({ where: { id: { in: [oficinaId, semPlanoId] } } });
  await prisma.$disconnect();
});

describe("ciclo de assinatura", () => {
  it("cria assinatura ativa com vencimento em ~30 dias", async () => {
    const a = await criarAssinatura(oficinaId, planoStarterId);
    expect(a.status).toBe("ATIVO");
    expect(a.vencimento.getTime()).toBeGreaterThan(Date.now());
    // Não duplica.
    await expect(criarAssinatura(oficinaId, planoStarterId)).rejects.toThrow(/já possui/i);
  });

  it("statusEfetivo bloqueia após vencimento + diasBloqueio", () => {
    const doisMesesAtras = new Date();
    doisMesesAtras.setMonth(doisMesesAtras.getMonth() - 2);
    expect(
      statusEfetivo({ status: "ATIVO", vencimento: doisMesesAtras, diasBloqueio: 7 })
    ).toBe("BLOQUEADO");

    const ontem = new Date(Date.now() - 86_400_000);
    expect(
      statusEfetivo({ status: "ATIVO", vencimento: ontem, diasBloqueio: 7 })
    ).toBe("ATRASADO"); // vencido mas dentro do prazo de tolerância

    const futuro = new Date(Date.now() + 5 * 86_400_000);
    expect(
      statusEfetivo({ status: "ATIVO", vencimento: futuro, diasBloqueio: 7 })
    ).toBe("ATIVO");
  });

  it("renovação reseta status para ATIVO e empurra o vencimento", async () => {
    await prisma.assinatura.update({
      where: { oficinaId },
      data: { status: "BLOQUEADO", vencimento: new Date(Date.now() - 40 * 86_400_000) },
    });
    const renovada = await renovarAssinatura(oficinaId);
    expect(renovada.status).toBe("ATIVO");
    expect(renovada.vencimento.getTime()).toBeGreaterThan(Date.now());
    expect(renovada.ultimoPagamentoEm).not.toBeNull();
  });
});

describe("feature-gating por plano", () => {
  it("respeita ia_enabled=false e bi_enabled=true", async () => {
    expect(await planoPermite(oficinaId, "ia_enabled")).toBe(false);
    expect(await planoPermite(oficinaId, "bi_enabled")).toBe(true);
    expect(await limitePlano(oficinaId, "max_users")).toBe(3);
  });

  it("oficina sem assinatura fica liberada (não quebra o legado)", async () => {
    expect(await planoPermite(semPlanoId, "ia_enabled")).toBe(true);
    expect(await planoPermite(semPlanoId, "bi_enabled")).toBe(true);
  });
});
