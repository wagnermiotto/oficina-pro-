import "server-only";
import type { StatusPedidoCompra } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import {
  TRANSICOES_PEDIDO,
  type FornecedorInput,
  type PedidoCompraInput,
} from "../schemas/compras-schemas";

export const POR_PAGINA = 20;

// --- Fornecedores ------------------------------------------------------------

export async function listarFornecedores(db: TenantDb) {
  return db.fornecedor.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { pedidosCompra: true, pecas: true } } },
  });
}

export async function criarFornecedor(
  db: TenantDb,
  oficinaId: string,
  dados: FornecedorInput
) {
  return db.fornecedor.create({ data: { ...dados, oficinaId } });
}

export async function atualizarFornecedor(
  db: TenantDb,
  id: string,
  dados: FornecedorInput
) {
  return db.fornecedor.update({ where: { id }, data: dados });
}

export async function excluirFornecedor(db: TenantDb, id: string) {
  return db.fornecedor.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// --- Pedidos de compra -------------------------------------------------------

export async function listarPedidos(db: TenantDb, { pagina }: { pagina: number }) {
  const [itens, total] = await Promise.all([
    db.pedidoCompra.findMany({
      orderBy: { numero: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        fornecedor: { select: { nome: true } },
        itens: { where: { deletedAt: null } },
      },
    }),
    db.pedidoCompra.count(),
  ]);
  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function criarPedido(
  db: TenantDb,
  oficinaId: string,
  dados: PedidoCompraInput
) {
  const config = await prisma.oficinaConfig.update({
    where: { oficinaId },
    data: { proximoNumeroPedido: { increment: 1 } },
  });
  const numero = config.proximoNumeroPedido - 1;

  const total = dados.itens.reduce(
    (soma, item) => soma + Math.round(item.custoUnitario * 100 * item.quantidade),
    0
  );

  return db.pedidoCompra.create({
    data: {
      oficinaId,
      numero,
      fornecedorId: dados.fornecedorId ?? null,
      observacoes: dados.observacoes ?? null,
      total: total / 100,
      itens: {
        create: dados.itens.map((item) => ({
          oficinaId,
          pecaId: item.pecaId ?? null,
          descricao: item.descricao,
          quantidade: item.quantidade,
          custoUnitario: item.custoUnitario,
        })),
      },
    },
  });
}

export class TransicaoPedidoInvalidaError extends Error {
  constructor(de: StatusPedidoCompra, para: StatusPedidoCompra) {
    super(`Transição de pedido inválida: ${de} → ${para}.`);
    this.name = "TransicaoPedidoInvalidaError";
  }
}

/**
 * Avança o status do pedido. No RECEBIDO: entrada automática no estoque,
 * atualização do preço de custo e lançamento de despesa (contas a pagar).
 */
export async function mudarStatusPedido(
  db: TenantDb,
  oficinaId: string,
  pedidoId: string,
  novoStatus: StatusPedidoCompra,
  usuarioId: string,
  notaFiscal?: string
) {
  const pedido = await db.pedidoCompra.findUnique({
    where: { id: pedidoId },
    include: {
      itens: { where: { deletedAt: null } },
      fornecedor: { select: { id: true, nome: true } },
    },
  });
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (!TRANSICOES_PEDIDO[pedido.status].includes(novoStatus)) {
    throw new TransicaoPedidoInvalidaError(pedido.status, novoStatus);
  }

  if (novoStatus === "RECEBIDO") {
    await prisma.$transaction(async (tx) => {
      for (const item of pedido.itens) {
        if (!item.pecaId) continue;
        await tx.peca.update({
          where: { id: item.pecaId, oficinaId },
          data: {
            quantidade: { increment: item.quantidade },
            precoCusto: item.custoUnitario,
          },
        });
        await tx.movimentacaoEstoque.create({
          data: {
            oficinaId,
            pecaId: item.pecaId,
            tipo: "ENTRADA",
            quantidade: item.quantidade,
            custoUnitario: item.custoUnitario,
            motivo: `Recebimento do pedido #${pedido.numero}`,
            pedidoCompraId: pedido.id,
            usuarioId,
          },
        });
      }
      const total = paraNumero(pedido.total);
      if (total > 0) {
        await tx.lancamentoFinanceiro.create({
          data: {
            oficinaId,
            tipo: "DESPESA",
            descricao: `Pedido de compra #${String(pedido.numero).padStart(4, "0")}${pedido.fornecedor ? ` — ${pedido.fornecedor.nome}` : ""}`,
            valor: total,
            status: "PENDENTE",
            vencimento: new Date(),
            fornecedorId: pedido.fornecedorId,
            pedidoCompraId: pedido.id,
          },
        });
      }
      await tx.pedidoCompra.update({
        where: { id: pedido.id, oficinaId },
        data: {
          status: "RECEBIDO",
          recebidoEm: new Date(),
          notaFiscal: notaFiscal ?? null,
        },
      });
    });
    return;
  }

  await db.pedidoCompra.update({
    where: { id: pedidoId },
    data: { status: novoStatus },
  });
}
