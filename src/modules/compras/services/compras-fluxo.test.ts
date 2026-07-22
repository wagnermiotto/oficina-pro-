import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import {
  registrarMovimentacao,
} from "@/modules/estoque/services/estoque-service";
import { criarPedido, mudarStatusPedido } from "./compras-service";

/**
 * Integração estoque + compras: movimentações manuais e o ciclo do pedido
 * de compra com entrada automática no estoque e despesa no financeiro.
 */

const oficinaId = `test-compras-${randomUUID().slice(0, 8)}`;
const usuarioId = "user-compras-teste";
let pecaId = "";
let fornecedorId = "";
let pedidoId = "";

const db = tenantDb(oficinaId);

beforeAll(async () => {
  await prisma.organization.create({
    data: {
      id: oficinaId,
      name: "Oficina Teste Compras",
      slug: oficinaId,
      createdAt: new Date(),
    },
  });
  await prisma.oficinaConfig.create({ data: { oficinaId } });
  const peca = await prisma.peca.create({
    data: {
      oficinaId,
      nome: "Bateria 60Ah",
      precoCusto: 300,
      precoVenda: 550,
      quantidade: 5,
      estoqueMinimo: 2,
    },
  });
  pecaId = peca.id;
  const fornecedor = await prisma.fornecedor.create({
    data: { oficinaId, nome: "Distribuidora Teste" },
  });
  fornecedorId = fornecedor.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("movimentações manuais de estoque", () => {
  it("entrada soma ao saldo", async () => {
    const saldo = await registrarMovimentacao(db, oficinaId, usuarioId, {
      pecaId,
      tipo: "ENTRADA",
      quantidade: 3,
      motivo: "Compra avulsa",
    });
    expect(saldo).toBe(8);
  });

  it("saída maior que o saldo é bloqueada", async () => {
    await expect(
      registrarMovimentacao(db, oficinaId, usuarioId, {
        pecaId,
        tipo: "SAIDA",
        quantidade: 100,
        motivo: undefined,
      })
    ).rejects.toThrow(/maior que o saldo/);
  });

  it("ajuste define o saldo absoluto", async () => {
    const saldo = await registrarMovimentacao(db, oficinaId, usuarioId, {
      pecaId,
      tipo: "AJUSTE",
      quantidade: 6,
      motivo: "Inventário",
    });
    expect(saldo).toBe(6);
  });
});

describe("ciclo do pedido de compra", () => {
  it("cria pedido com numeração e total calculado", async () => {
    const pedido = await criarPedido(db, oficinaId, {
      fornecedorId,
      observacoes: undefined,
      itens: [
        { pecaId, descricao: "Bateria 60Ah", quantidade: 4, custoUnitario: 280 },
        {
          pecaId: undefined,
          descricao: "Frete",
          quantidade: 1,
          custoUnitario: 50,
        },
      ],
    });
    pedidoId = pedido.id;
    expect(pedido.numero).toBe(1);
    expect(paraNumero(pedido.total)).toBe(1170);
    expect(pedido.status).toBe("SOLICITACAO");
  });

  it("segue o fluxo solicitação → cotação → pedido", async () => {
    await mudarStatusPedido(db, oficinaId, pedidoId, "COTACAO", usuarioId);
    await mudarStatusPedido(db, oficinaId, pedidoId, "PEDIDO", usuarioId);
    const pedido = await db.pedidoCompra.findUniqueOrThrow({
      where: { id: pedidoId },
    });
    expect(pedido.status).toBe("PEDIDO");
  });

  it("bloqueia transição inválida", async () => {
    await expect(
      mudarStatusPedido(db, oficinaId, pedidoId, "SOLICITACAO", usuarioId)
    ).rejects.toThrow(/inválida/);
  });

  it("recebimento dá entrada no estoque, atualiza custo e lança despesa", async () => {
    await mudarStatusPedido(
      db,
      oficinaId,
      pedidoId,
      "RECEBIDO",
      usuarioId,
      "NF-12345"
    );

    const peca = await prisma.peca.findUniqueOrThrow({ where: { id: pecaId } });
    expect(paraNumero(peca.quantidade)).toBe(10); // 6 + 4 recebidas
    expect(paraNumero(peca.precoCusto)).toBe(280); // custo atualizado

    const movimentacoes = await db.movimentacaoEstoque.findMany({
      where: { pedidoCompraId: pedidoId },
    });
    expect(movimentacoes).toHaveLength(1);
    expect(movimentacoes[0]!.tipo).toBe("ENTRADA");

    const despesas = await db.lancamentoFinanceiro.findMany({
      where: { pedidoCompraId: pedidoId },
    });
    expect(despesas).toHaveLength(1);
    expect(despesas[0]!.tipo).toBe("DESPESA");
    expect(paraNumero(despesas[0]!.valor)).toBe(1170);

    const pedido = await db.pedidoCompra.findUniqueOrThrow({
      where: { id: pedidoId },
    });
    expect(pedido.notaFiscal).toBe("NF-12345");
    expect(pedido.recebidoEm).not.toBeNull();
  });
});
