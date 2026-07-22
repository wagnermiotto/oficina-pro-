import "server-only";
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";
import { STATUS_OS_ATIVOS } from "@/shared/constants/os";
import type { PontoFluxo, ResumoDashboard } from "../types";

/** Agrega todos os indicadores exibidos no dashboard num único round-trip. */
export async function obterResumoDashboard(
  db: TenantDb
): Promise<ResumoDashboard> {
  const agora = new Date();
  const inicioHoje = startOfDay(agora);
  const fimHoje = endOfDay(agora);
  const inicioMes = startOfMonth(agora);
  const inicio14Dias = startOfDay(subDays(agora, 13));

  const [
    veiculosNaOficina,
    ordensAbertas,
    aguardandoAprovacao,
    aguardandoPecas,
    receitaDiaAgg,
    receitaMesAgg,
    despesaMesAgg,
    ticketAgg,
    pecas,
    agendamentos,
    porStatus,
    lancamentos14d,
    osRecentesRaw,
  ] = await Promise.all([
    db.ordemServico.count({ where: { status: { in: STATUS_OS_ATIVOS } } }),
    db.ordemServico.count({
      where: { status: { notIn: ["FINALIZADO", "ENTREGUE", "CANCELADO"] } },
    }),
    db.ordemServico.count({ where: { status: "AGUARDANDO_APROVACAO" } }),
    db.ordemServico.count({ where: { status: "AGUARDANDO_PECAS" } }),
    db.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: {
        tipo: "RECEITA",
        status: "PAGO",
        pagoEm: { gte: inicioHoje, lte: fimHoje },
      },
    }),
    db.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: { tipo: "RECEITA", status: "PAGO", pagoEm: { gte: inicioMes } },
    }),
    db.lancamentoFinanceiro.aggregate({
      _sum: { valor: true },
      where: { tipo: "DESPESA", status: "PAGO", pagoEm: { gte: inicioMes } },
    }),
    db.ordemServico.aggregate({
      _avg: { total: true },
      where: {
        status: { in: ["FINALIZADO", "ENTREGUE"] },
        updatedAt: { gte: inicioMes },
      },
    }),
    db.peca.findMany({
      where: { ativo: true },
      select: { quantidade: true, estoqueMinimo: true },
    }),
    db.agendamento.findMany({
      where: {
        inicio: { gte: inicioHoje, lte: fimHoje },
        status: { in: ["AGENDADO", "CONFIRMADO"] },
      },
      orderBy: { inicio: "asc" },
      take: 8,
      include: { cliente: { select: { nome: true } } },
    }),
    db.ordemServico.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.lancamentoFinanceiro.findMany({
      where: { status: "PAGO", pagoEm: { gte: inicio14Dias } },
      select: { tipo: true, valor: true, pagoEm: true },
    }),
    db.ordemServico.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        cliente: { select: { nome: true } },
        veiculo: { select: { marca: true, modelo: true, placa: true } },
      },
    }),
  ]);

  // Estoque baixo: comparação entre colunas não é suportada no where do
  // Prisma — filtra em memória (volume de peças por oficina é pequeno).
  const estoqueBaixo = pecas.filter(
    (p) => paraNumero(p.quantidade) <= paraNumero(p.estoqueMinimo)
  ).length;

  const receitaMes = paraNumero(receitaMesAgg._sum.valor);
  const despesaMes = paraNumero(despesaMesAgg._sum.valor);

  const dias = eachDayOfInterval({ start: inicio14Dias, end: agora });
  const fluxoDiario: PontoFluxo[] = dias.map((dia) => {
    const proximoDia = addDays(dia, 1);
    let receitas = 0;
    let despesas = 0;
    for (const lancamento of lancamentos14d) {
      if (!lancamento.pagoEm) continue;
      if (lancamento.pagoEm >= dia && lancamento.pagoEm < proximoDia) {
        if (lancamento.tipo === "RECEITA") {
          receitas += paraNumero(lancamento.valor);
        } else {
          despesas += paraNumero(lancamento.valor);
        }
      }
    }
    return {
      dia: format(dia, "dd/MM", { locale: ptBR }),
      receitas: Math.round(receitas * 100) / 100,
      despesas: Math.round(despesas * 100) / 100,
    };
  });

  return {
    veiculosNaOficina,
    ordensAbertas,
    aguardandoAprovacao,
    aguardandoPecas,
    receitaDia: paraNumero(receitaDiaAgg._sum.valor),
    receitaMes,
    despesaMes,
    lucroMes: Math.round((receitaMes - despesaMes) * 100) / 100,
    ticketMedioMes: paraNumero(ticketAgg._avg.total),
    estoqueBaixo,
    agendamentosHoje: agendamentos.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      horario: format(a.inicio, "HH:mm"),
      tipo: a.tipo,
      cliente: a.cliente?.nome ?? null,
    })),
    osPorStatus: porStatus.map((g) => ({
      status: g.status,
      quantidade: g._count._all,
    })),
    fluxoDiario,
    osRecentes: osRecentesRaw.map((os) => ({
      id: os.id,
      numero: os.numero,
      cliente: os.cliente.nome,
      veiculo:
        [os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ") +
        ` · ${formatarPlaca(os.veiculo.placa)}`,
      status: os.status,
      total: paraNumero(os.total),
      dataEntrada: format(os.dataEntrada, "dd/MM/yyyy"),
    })),
  };
}
