import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import {
  CHAVE_PROPRIETARIO,
  criarPerfil,
  duplicarPerfil,
  excluirPerfil,
  existeOutroEditorDePermissoes,
  normalizarChaves,
  semearPerfisPadrao,
  seedsPerfisPadrao,
  substituirMatriz,
} from "./permissoes-service";

/**
 * Onda D (RBAC) — R1: seeds, normalização de chaves, proteções do Proprietário
 * e regra do último editor de permissões.
 */

const oficinaId = `test-rbac-${randomUUID().slice(0, 8)}`;
const db = tenantDb(oficinaId);
const donoId = `dono-${randomUUID().slice(0, 8)}`;
const mecId = `mec-${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: oficinaId, name: "Oficina RBAC", slug: oficinaId, createdAt: new Date() },
  });
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("seeds de perfis padrão", () => {
  it("cria os 7 perfis e é idempotente", async () => {
    const proprietarioId = await semearPerfisPadrao(prisma, oficinaId);
    expect(proprietarioId).toBeTruthy();

    const denovo = await semearPerfisPadrao(prisma, oficinaId);
    expect(denovo).toBe(proprietarioId);

    const perfis = await db.perfilAcesso.findMany({ where: {} });
    expect(perfis.length).toBe(seedsPerfisPadrao().length);
    expect(perfis.every((p) => p.sistema)).toBe(true);
  });

  it("Proprietário tem todas as permissões; Mecânico não vê valores nem cria OS", async () => {
    const perfis = await db.perfilAcesso.findMany({
      where: {},
      select: { chave: true, permissoes: { select: { modulo: true, acao: true } } },
    });
    const prop = perfis.find((p) => p.chave === CHAVE_PROPRIETARIO)!;
    const mec = perfis.find((p) => p.chave === "MECANICO")!;

    const chavesProp = normalizarChaves(prop.permissoes);
    expect(chavesProp.has("permissoes.EDITAR")).toBe(true);
    expect(chavesProp.has("financeiro.VISUALIZAR")).toBe(true);

    const chavesMec = normalizarChaves(mec.permissoes);
    expect(chavesMec.has("ordens.VISUALIZAR")).toBe(true);
    expect(chavesMec.has("ordens.VISUALIZAR_TODAS")).toBe(false);
    expect(chavesMec.has("ordens.CRIAR")).toBe(false);
    expect(chavesMec.has("ordens.VER_VALORES")).toBe(false);
    expect(chavesMec.has("financeiro.VISUALIZAR")).toBe(false);
  });
});

describe("normalização", () => {
  it("VISUALIZAR_TODAS implica VISUALIZAR", () => {
    const chaves = normalizarChaves([{ modulo: "ordens", acao: "VISUALIZAR_TODAS" }]);
    expect(chaves.has("ordens.VISUALIZAR")).toBe(true);
    expect(chaves.has("ordens.VISUALIZAR_TODAS")).toBe(true);
  });
});

describe("proteções", () => {
  it("matriz do Proprietário é travada", async () => {
    const prop = await db.perfilAcesso.findFirst({
      where: { chave: CHAVE_PROPRIETARIO },
      select: { id: true },
    });
    await expect(
      substituirMatriz(db, oficinaId, prop!.id, [{ modulo: "dashboard", acao: "VISUALIZAR" }])
    ).rejects.toThrow(/Proprietário/);
  });

  it("perfil sistema não pode ser excluído; custom em uso também não", async () => {
    const gerente = await db.perfilAcesso.findFirst({
      where: { chave: "GERENTE" },
      select: { id: true },
    });
    await expect(excluirPerfil(db, gerente!.id)).rejects.toThrow(/padrão do sistema/);

    const custom = await criarPerfil(db, oficinaId, {
      nome: "Lavador",
      permissoes: [{ modulo: "dashboard", acao: "VISUALIZAR" }],
    });
    await db.funcionarioPerfil.create({
      data: { oficinaId, userId: mecId, cargo: "MECANICO", perfilAcessoId: custom.id },
    });
    await expect(excluirPerfil(db, custom.id)).rejects.toThrow(/em uso/);
  });

  it("substituirMatriz troca em lote, filtra inválidas e retorna antes/depois", async () => {
    const perfil = await criarPerfil(db, oficinaId, {
      nome: "Consultor",
      permissoes: [{ modulo: "clientes", acao: "VISUALIZAR" }],
    });
    const resultado = await substituirMatriz(db, oficinaId, perfil.id, [
      { modulo: "clientes", acao: "VISUALIZAR" },
      { modulo: "clientes", acao: "CRIAR" },
      { modulo: "modulo-fake", acao: "HACK" },
    ]);
    expect(resultado.antes).toEqual(["clientes.VISUALIZAR"]);
    expect(resultado.depois).toEqual(["clientes.CRIAR", "clientes.VISUALIZAR"]);
  });

  it("duplicar copia a matriz e nasce custom", async () => {
    const atendente = await db.perfilAcesso.findFirst({
      where: { chave: "ATENDENTE" },
      select: { id: true, permissoes: { select: { id: true } } },
    });
    const copia = await duplicarPerfil(db, oficinaId, atendente!.id, "Atendente Sênior");
    const salvo = await db.perfilAcesso.findFirst({
      where: { id: copia.id },
      select: { sistema: true, chave: true, permissoes: { select: { id: true } } },
    });
    expect(salvo!.sistema).toBe(false);
    expect(salvo!.chave).toBeNull();
    expect(salvo!.permissoes.length).toBe(atendente!.permissoes.length);
  });
});

describe("regra do último editor", () => {
  it("detecta quando só resta um funcionário com permissoes.EDITAR", async () => {
    const proprietarioId = await semearPerfisPadrao(prisma, oficinaId);
    await db.funcionarioPerfil.create({
      data: { oficinaId, userId: donoId, cargo: "ADMIN", perfilAcessoId: proprietarioId },
    });

    // O dono é o único editor: ignorá-lo deixa a oficina sem ninguém.
    expect(await existeOutroEditorDePermissoes(db, { userId: donoId })).toBe(false);
    // Sem ignorar ninguém, ele conta.
    expect(await existeOutroEditorDePermissoes(db)).toBe(true);
    // O mecânico (perfil custom "Lavador", sem permissoes.EDITAR) não conta.
    expect(await existeOutroEditorDePermissoes(db, { userId: donoId })).toBe(false);
  });
});
