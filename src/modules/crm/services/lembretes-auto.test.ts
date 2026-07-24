import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import { lembretesAutomaticos } from "./crm-service";

/**
 * Lembretes automáticos: aniversário nos próximos 7 dias e revisão ~6 meses
 * após a última OS entregue.
 */

const oficinaId = `test-lembretes-${randomUUID().slice(0, 8)}`;
const db = tenantDb(oficinaId);

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: oficinaId, name: "Oficina Lembretes", slug: oficinaId, createdAt: new Date() },
  });
  await prisma.oficinaConfig.create({ data: { oficinaId } });

  const hoje = new Date();
  // Aniversariante amanhã (mesmo mês/dia, ano antigo).
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const aniversariante = await prisma.cliente.create({
    data: {
      oficinaId,
      nome: "Ana Aniversario",
      whatsapp: "11999990000",
      dataNascimento: new Date(1990, amanha.getMonth(), amanha.getDate()),
    },
  });

  // Cliente sem aniversário próximo (6 meses à frente).
  const outroMes = new Date(hoje);
  outroMes.setMonth(outroMes.getMonth() + 6);
  await prisma.cliente.create({
    data: {
      oficinaId,
      nome: "Bruno Longe",
      dataNascimento: new Date(1985, outroMes.getMonth(), outroMes.getDate()),
    },
  });

  // Cliente com OS entregue há ~6 meses → revisão sugerida.
  const revisao = await prisma.cliente.create({
    data: { oficinaId, nome: "Carla Revisao", telefone: "1188887777" },
  });
  const veiculo = await prisma.veiculo.create({
    data: { oficinaId, clienteId: revisao.id, placa: "REV1A23", modelo: "Onix" },
  });
  const seisMeses = new Date(hoje);
  seisMeses.setMonth(seisMeses.getMonth() - 6);
  await prisma.ordemServico.create({
    data: {
      oficinaId,
      numero: 1,
      clienteId: revisao.id,
      veiculoId: veiculo.id,
      status: "ENTREGUE",
      dataConclusao: seisMeses,
    },
  });

  void aniversariante;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("lembretesAutomaticos", () => {
  it("gera aniversário próximo e revisão ~6 meses, ignorando o resto", async () => {
    const lembretes = await lembretesAutomaticos(db);
    const aniversarios = lembretes.filter((l) => l.tipo === "aniversario");
    const revisoes = lembretes.filter((l) => l.tipo === "revisao");

    expect(aniversarios.map((a) => a.cliente)).toContain("Ana Aniversario");
    expect(aniversarios.map((a) => a.cliente)).not.toContain("Bruno Longe");
    expect(revisoes.map((r) => r.cliente)).toContain("Carla Revisao");
    expect(revisoes[0]?.detalhe).toMatch(/Revisão sugerida/);
  });
});
