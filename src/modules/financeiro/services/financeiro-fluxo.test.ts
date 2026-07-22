import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import { gerarCSV, numeroCSV } from "@/shared/utils/csv";
import {
  cancelarLancamento,
  criarLancamento,
  marcarPago,
  resumoFinanceiro,
} from "./financeiro-service";

const oficinaId = `test-fin-${randomUUID().slice(0, 8)}`;
const db = tenantDb(oficinaId);
let receitaId = "";
let despesaId = "";

beforeAll(async () => {
  await prisma.organization.create({
    data: {
      id: oficinaId,
      name: "Oficina Teste Financeiro",
      slug: oficinaId,
      createdAt: new Date(),
    },
  });
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("financeiro — lançamentos e resumo", () => {
  it("cria receita pendente (contas a receber)", async () => {
    const receita = await criarLancamento(db, oficinaId, {
      tipo: "RECEITA",
      descricao: "Serviço avulso",
      valor: 500,
      vencimento: new Date(),
      centroCustoId: undefined,
      formaPagamento: undefined,
      pagoAgora: false,
      observacoes: undefined,
    });
    receitaId = receita.id;
    expect(receita.status).toBe("PENDENTE");
  });

  it("cria despesa já paga (entra direto no caixa)", async () => {
    const despesa = await criarLancamento(db, oficinaId, {
      tipo: "DESPESA",
      descricao: "Material de limpeza",
      valor: 120.5,
      vencimento: undefined,
      centroCustoId: undefined,
      formaPagamento: "PIX",
      pagoAgora: true,
      observacoes: undefined,
    });
    despesaId = despesa.id;
    expect(despesa.status).toBe("PAGO");
    expect(despesa.pagoEm).not.toBeNull();
  });

  it("resumo reflete pendentes e pagos", async () => {
    const resumo = await resumoFinanceiro(db);
    expect(resumo.aReceber).toBe(500);
    expect(resumo.despesasMes).toBe(120.5);
    expect(resumo.receitasMes).toBe(0);
    expect(resumo.lucroMes).toBe(-120.5);
  });

  it("baixa a receita e atualiza o caixa", async () => {
    await marcarPago(db, receitaId, "CARTAO_CREDITO");
    const resumo = await resumoFinanceiro(db);
    expect(resumo.aReceber).toBe(0);
    expect(resumo.receitasMes).toBe(500);
    expect(resumo.lucroMes).toBe(379.5);
  });

  it("não permite baixar duas vezes", async () => {
    await expect(marcarPago(db, receitaId, "PIX")).rejects.toThrow(/pendentes/);
  });

  it("não permite cancelar lançamento pago", async () => {
    await expect(cancelarLancamento(db, despesaId)).rejects.toThrow(/pagos/);
  });

  it("cancela lançamento pendente", async () => {
    const pendente = await criarLancamento(db, oficinaId, {
      tipo: "DESPESA",
      descricao: "Cancelável",
      valor: 10,
      vencimento: undefined,
      centroCustoId: undefined,
      formaPagamento: undefined,
      pagoAgora: false,
      observacoes: undefined,
    });
    const cancelado = await cancelarLancamento(db, pendente.id);
    expect(cancelado.status).toBe("CANCELADO");
    const resumo = await resumoFinanceiro(db);
    expect(resumo.aPagar).toBe(0);
  });
});

describe("utilitário CSV", () => {
  it("escapa separadores e aspas", () => {
    const csv = gerarCSV(
      ["Nome", "Valor"],
      [
        ["Item; com separador", 10],
        ['Item "com aspas"', 20],
      ]
    );
    expect(csv).toContain('"Item; com separador"');
    expect(csv).toContain('"Item ""com aspas"""');
    expect(csv.startsWith("﻿")).toBe(true); // BOM
  });

  it("formata número em decimal brasileiro", () => {
    expect(numeroCSV(1234.5)).toBe("1234,50");
    expect(paraNumero("89.9")).toBe(89.9);
  });
});
