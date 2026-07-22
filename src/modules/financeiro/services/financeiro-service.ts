import "server-only";
import type { FormaPagamento, Prisma, StatusLancamento, TipoLancamento } from "@prisma/client";
import { endOfDay, startOfDay, startOfMonth } from "date-fns";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import type { LancamentoInput } from "../schemas/financeiro-schemas";

export const POR_PAGINA = 25;

export interface FiltrosLancamentos {
  pagina: number;
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  de?: Date;
  ate?: Date;
  busca?: string;
}

function montarWhere(filtros: Omit<FiltrosLancamentos, "pagina">) {
  const where: Prisma.LancamentoFinanceiroWhereInput = {
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(filtros.busca
      ? { descricao: { contains: filtros.busca, mode: "insensitive" } }
      : {}),
  };
  if (filtros.de || filtros.ate) {
    where.OR = [
      {
        pagoEm: {
          ...(filtros.de ? { gte: startOfDay(filtros.de) } : {}),
          ...(filtros.ate ? { lte: endOfDay(filtros.ate) } : {}),
        },
      },
      {
        pagoEm: null,
        vencimento: {
          ...(filtros.de ? { gte: startOfDay(filtros.de) } : {}),
          ...(filtros.ate ? { lte: endOfDay(filtros.ate) } : {}),
        },
      },
    ];
  }
  return where;
}

export async function listarLancamentos(db: TenantDb, filtros: FiltrosLancamentos) {
  const where = montarWhere(filtros);
  const [itens, total] = await Promise.all([
    db.lancamentoFinanceiro.findMany({
      where,
      orderBy: [{ status: "asc" }, { vencimento: "desc" }, { createdAt: "desc" }],
      skip: (filtros.pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        cliente: { select: { nome: true } },
        fornecedor: { select: { nome: true } },
        centroCusto: { select: { nome: true } },
        ordemServico: { select: { id: true, numero: true } },
      },
    }),
    db.lancamentoFinanceiro.count({ where }),
  ]);
  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

/** Todos os lançamentos do período (sem paginação) para exportação. */
export async function listarLancamentosParaExportar(
  db: TenantDb,
  filtros: Omit<FiltrosLancamentos, "pagina">
) {
  return db.lancamentoFinanceiro.findMany({
    where: montarWhere(filtros),
    orderBy: [{ vencimento: "asc" }, { createdAt: "asc" }],
    take: 5000,
    include: {
      cliente: { select: { nome: true } },
      fornecedor: { select: { nome: true } },
      centroCusto: { select: { nome: true } },
      ordemServico: { select: { numero: true } },
    },
  });
}

export async function criarLancamento(
  db: TenantDb,
  oficinaId: string,
  dados: LancamentoInput
) {
  const agora = new Date();
  return db.lancamentoFinanceiro.create({
    data: {
      oficinaId,
      tipo: dados.tipo,
      descricao: dados.descricao,
      valor: dados.valor,
      vencimento: dados.vencimento ?? agora,
      centroCustoId: dados.centroCustoId ?? null,
      observacoes: dados.observacoes ?? null,
      ...(dados.pagoAgora
        ? {
            status: "PAGO" as const,
            pagoEm: agora,
            formaPagamento: dados.formaPagamento ?? "OUTRO",
          }
        : { status: "PENDENTE" as const }),
    },
  });
}

export async function marcarPago(
  db: TenantDb,
  id: string,
  formaPagamento: FormaPagamento
) {
  const lancamento = await db.lancamentoFinanceiro.findUnique({ where: { id } });
  if (!lancamento) throw new Error("Lançamento não encontrado.");
  if (lancamento.status !== "PENDENTE") {
    throw new Error("Apenas lançamentos pendentes podem ser baixados.");
  }
  return db.lancamentoFinanceiro.update({
    where: { id },
    data: { status: "PAGO", pagoEm: new Date(), formaPagamento },
  });
}

export async function cancelarLancamento(db: TenantDb, id: string) {
  const lancamento = await db.lancamentoFinanceiro.findUnique({ where: { id } });
  if (!lancamento) throw new Error("Lançamento não encontrado.");
  if (lancamento.status === "PAGO") {
    throw new Error("Lançamentos pagos não podem ser cancelados — estorne manualmente.");
  }
  return db.lancamentoFinanceiro.update({
    where: { id },
    data: { status: "CANCELADO" },
  });
}

export interface ResumoFinanceiro {
  receitasMes: number;
  despesasMes: number;
  lucroMes: number;
  aReceber: number;
  aPagar: number;
  vencidos: number;
}

export async function resumoFinanceiro(db: TenantDb): Promise<ResumoFinanceiro> {
  const inicioMes = startOfMonth(new Date());
  const hoje = startOfDay(new Date());
  const [receitas, despesas, aReceber, aPagar, vencidos] = await Promise.all([
    db.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: { tipo: "RECEITA", status: "PAGO", pagoEm: { gte: inicioMes } },
    }),
    db.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: { tipo: "DESPESA", status: "PAGO", pagoEm: { gte: inicioMes } },
    }),
    db.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: { tipo: "RECEITA", status: "PENDENTE" },
    }),
    db.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: { tipo: "DESPESA", status: "PENDENTE" },
    }),
    db.lancamentoFinanceiro.count({
      where: { status: "PENDENTE", vencimento: { lt: hoje } },
    }),
  ]);
  const receitasMes = paraNumero(receitas._sum.valor);
  const despesasMes = paraNumero(despesas._sum.valor);
  return {
    receitasMes,
    despesasMes,
    lucroMes: Math.round((receitasMes - despesasMes) * 100) / 100,
    aReceber: paraNumero(aReceber._sum.valor),
    aPagar: paraNumero(aPagar._sum.valor),
    vencidos,
  };
}

// --- Comissões ---------------------------------------------------------------

export async function listarComissoes(db: TenantDb) {
  return db.comissao.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { ordemServico: { select: { id: true, numero: true } } },
  });
}

export async function pagarComissao(db: TenantDb, oficinaId: string, id: string) {
  const comissao = await db.comissao.findUnique({ where: { id } });
  if (!comissao) throw new Error("Comissão não encontrada.");
  if (comissao.status === "PAGA") throw new Error("Comissão já paga.");
  const paga = await db.comissao.update({
    where: { id },
    data: { status: "PAGA", pagaEm: new Date() },
  });
  // Espelha a comissão paga como despesa no caixa.
  await db.lancamentoFinanceiro.create({
    data: {
      oficinaId,
      tipo: "DESPESA",
      descricao: `Comissão — OS`,
      valor: comissao.valor,
      status: "PAGO",
      pagoEm: new Date(),
      formaPagamento: "OUTRO",
      ordemServicoId: comissao.ordemServicoId,
    },
  });
  return paga;
}
