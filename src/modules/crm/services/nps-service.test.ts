import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import {
  criarPesquisaNps,
  obterPesquisaPorToken,
  responderNps,
  resumoNps,
} from "./nps-service";

/**
 * Fluxo NPS: geração do link só para OS entregue, resposta única e cálculo
 * do score (promotores 9-10 menos detratores 0-6).
 */

const oficinaId = `test-nps-${randomUUID().slice(0, 8)}`;
const db = tenantDb(oficinaId);
let clienteId = "";
let osEntregueId = "";
let osAbertaId = "";

async function criarOS(numero: number, status: "ENTREGUE" | "RECEBIDO") {
  const os = await prisma.ordemServico.create({
    data: {
      oficinaId,
      numero,
      clienteId,
      veiculoId,
      status,
    },
  });
  return os.id;
}

let veiculoId = "";

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: oficinaId, name: "Oficina NPS", slug: oficinaId, createdAt: new Date() },
  });
  await prisma.oficinaConfig.create({ data: { oficinaId } });
  const cliente = await prisma.cliente.create({
    data: { oficinaId, nome: "Cliente NPS" },
  });
  clienteId = cliente.id;
  const veiculo = await prisma.veiculo.create({
    data: { oficinaId, clienteId, placa: "NPS1A23" },
  });
  veiculoId = veiculo.id;
  osEntregueId = await criarOS(1, "ENTREGUE");
  osAbertaId = await criarOS(2, "RECEBIDO");
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("geração do link", () => {
  it("bloqueia OS que não foi entregue", async () => {
    await expect(criarPesquisaNps(db, oficinaId, osAbertaId)).rejects.toThrow(
      /concluído|entregue/i
    );
  });

  it("gera para OS entregue e reaproveita se ainda não respondida", async () => {
    const p1 = await criarPesquisaNps(db, oficinaId, osEntregueId);
    const p2 = await criarPesquisaNps(db, oficinaId, osEntregueId);
    expect(p1.id).toBe(p2.id); // não duplica link pendente
    expect(p1.token.length).toBeGreaterThan(20);
  });
});

describe("resposta e score", () => {
  it("registra a nota e impede resposta dupla", async () => {
    const pesquisa = await criarPesquisaNps(db, oficinaId, osEntregueId);
    await responderNps(pesquisa.token, { nota: 10, comentario: "Excelente!" });

    const respondida = await obterPesquisaPorToken(pesquisa.token);
    expect(respondida?.nota).toBe(10);
    expect(respondida?.respondidoEm).not.toBeNull();

    await expect(
      responderNps(pesquisa.token, { nota: 5 })
    ).rejects.toThrow(/já foi respondida/i);
  });

  it("rejeita nota fora de 0..10", async () => {
    const os = await criarOS(3, "ENTREGUE");
    const pesquisa = await criarPesquisaNps(db, oficinaId, os);
    await expect(responderNps(pesquisa.token, { nota: 11 })).rejects.toThrow(
      /0 a 10/
    );
  });

  it("calcula NPS = %promotores − %detratores", async () => {
    // Já existe 1 promotor (nota 10). Adiciona 1 detrator (nota 3).
    const os = await criarOS(4, "ENTREGUE");
    const pesquisa = await criarPesquisaNps(db, oficinaId, os);
    await responderNps(pesquisa.token, { nota: 3 });

    const resumo = await resumoNps(db);
    expect(resumo.totalRespostas).toBe(2);
    expect(resumo.promotores).toBe(1);
    expect(resumo.detratores).toBe(1);
    expect(resumo.score).toBe(0); // (1 − 1) / 2 * 100
    expect(resumo.media).toBe(6.5); // (10 + 3) / 2
  });
});
