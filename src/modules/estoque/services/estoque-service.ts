import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import type { MovimentacaoInput, PecaInput } from "../schemas/estoque-schemas";

export const POR_PAGINA = 20;

export async function listarPecas(
  db: TenantDb,
  {
    busca,
    pagina,
    somenteBaixo,
  }: { busca?: string; pagina: number; somenteBaixo?: boolean }
) {
  const where: Prisma.PecaWhereInput = {
    ativo: true,
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { codigo: { contains: busca, mode: "insensitive" } },
            { codigoBarras: { contains: busca } },
            { marca: { contains: busca, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const todas = await db.peca.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      categoria: { select: { nome: true } },
      fornecedor: { select: { nome: true } },
    },
  });

  const filtradas = somenteBaixo
    ? todas.filter((p) => paraNumero(p.quantidade) <= paraNumero(p.estoqueMinimo))
    : todas;

  const total = filtradas.length;
  const itens = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function resumoEstoque(db: TenantDb) {
  const pecas = await db.peca.findMany({
    where: { ativo: true },
    select: { quantidade: true, estoqueMinimo: true, precoCusto: true },
  });
  const abaixoMinimo = pecas.filter(
    (p) => paraNumero(p.quantidade) <= paraNumero(p.estoqueMinimo)
  ).length;
  const valorCusto = pecas.reduce(
    (soma, p) => soma + paraNumero(p.precoCusto) * paraNumero(p.quantidade),
    0
  );
  return {
    totalItens: pecas.length,
    abaixoMinimo,
    valorCusto: Math.round(valorCusto * 100) / 100,
  };
}

export async function criarPeca(
  db: TenantDb,
  oficinaId: string,
  usuarioId: string,
  dados: PecaInput
) {
  const { quantidadeInicial, ...campos } = dados;
  const peca = await db.peca.create({
    data: { ...campos, quantidade: quantidadeInicial, oficinaId },
  });
  if (quantidadeInicial > 0) {
    await db.movimentacaoEstoque.create({
      data: {
        oficinaId,
        pecaId: peca.id,
        tipo: "ENTRADA",
        quantidade: quantidadeInicial,
        custoUnitario: dados.precoCusto,
        motivo: "Saldo inicial",
        usuarioId,
      },
    });
  }
  return peca;
}

export async function atualizarPeca(db: TenantDb, id: string, dados: PecaInput) {
  const { quantidadeInicial: _ignorada, ...campos } = dados;
  return db.peca.update({ where: { id }, data: campos });
}

export async function excluirPeca(db: TenantDb, id: string) {
  const emUso = await db.oSPeca.count({
    where: {
      pecaId: id,
      deletedAt: null,
      ordemServico: {
        status: { notIn: ["FINALIZADO", "ENTREGUE", "CANCELADO"] },
      },
    },
  });
  if (emUso > 0) {
    throw new Error("Peça vinculada a OS em andamento não pode ser excluída.");
  }
  return db.peca.update({
    where: { id },
    data: { ativo: false, deletedAt: new Date() },
  });
}

/** Movimentação manual de estoque (entrada, saída ou ajuste absoluto). */
export async function registrarMovimentacao(
  db: TenantDb,
  oficinaId: string,
  usuarioId: string,
  dados: MovimentacaoInput
) {
  const peca = await db.peca.findUnique({ where: { id: dados.pecaId } });
  if (!peca) throw new Error("Peça não encontrada.");
  const saldoAtual = paraNumero(peca.quantidade);

  let novoSaldo: number;
  let quantidadeMov: number;
  switch (dados.tipo) {
    case "ENTRADA":
      quantidadeMov = Math.abs(dados.quantidade);
      novoSaldo = saldoAtual + quantidadeMov;
      break;
    case "SAIDA":
      quantidadeMov = Math.abs(dados.quantidade);
      if (quantidadeMov > saldoAtual) {
        throw new Error(
          `Saída maior que o saldo disponível (${saldoAtual} ${peca.unidade}).`
        );
      }
      novoSaldo = saldoAtual - quantidadeMov;
      break;
    case "AJUSTE":
      // No ajuste, a quantidade informada é o NOVO saldo absoluto.
      novoSaldo = Math.abs(dados.quantidade);
      quantidadeMov = Math.round((novoSaldo - saldoAtual) * 1000) / 1000;
      break;
  }

  await prisma.$transaction([
    prisma.peca.update({
      where: { id: peca.id, oficinaId },
      data: { quantidade: novoSaldo },
    }),
    prisma.movimentacaoEstoque.create({
      data: {
        oficinaId,
        pecaId: peca.id,
        tipo: dados.tipo,
        quantidade: quantidadeMov,
        custoUnitario: dados.custoUnitario ?? null,
        motivo: dados.motivo ?? null,
        usuarioId,
      },
    }),
  ]);
  return novoSaldo;
}

export async function listarMovimentacoes(
  db: TenantDb,
  { pagina }: { pagina: number }
) {
  const [itens, total] = await Promise.all([
    db.movimentacaoEstoque.findMany({
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        peca: { select: { nome: true, unidade: true } },
        ordemServico: { select: { id: true, numero: true } },
        pedidoCompra: { select: { id: true, numero: true } },
      },
    }),
    db.movimentacaoEstoque.count(),
  ]);
  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function listarCategorias(db: TenantDb) {
  return db.categoriaPeca.findMany({ orderBy: { nome: "asc" } });
}

export async function criarCategoria(db: TenantDb, oficinaId: string, nome: string) {
  return db.categoriaPeca.create({ data: { oficinaId, nome } });
}
