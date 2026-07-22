import "server-only";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";

export interface ResumoBI {
  mensal: { mes: string; receitas: number; despesas: number }[];
  topServicos: { nome: string; quantidade: number; total: number }[];
  topPecas: { nome: string; quantidade: number }[];
  rankingMecanicos: { nome: string; ordens: number; receita: number }[];
}

/** Indicadores de BI: comparativo mensal, campeões de venda e ranking. */
export async function obterResumoBI(db: TenantDb): Promise<ResumoBI> {
  const inicio = startOfMonth(subMonths(new Date(), 5));

  const [lancamentos, servicos, pecas, osFinalizadas] = await Promise.all([
    db.lancamentoFinanceiro.findMany({
      where: { status: "PAGO", pagoEm: { gte: inicio } },
      select: { tipo: true, valor: true, pagoEm: true },
    }),
    db.oSServico.findMany({
      where: { status: { not: "RECUSADO" } },
      select: { descricao: true, valor: true },
      take: 5000,
    }),
    db.oSPeca.findMany({
      where: { status: { not: "RECUSADO" } },
      select: { descricao: true, quantidade: true },
      take: 5000,
    }),
    db.ordemServico.findMany({
      where: { status: { in: ["FINALIZADO", "ENTREGUE"] }, mecanicoId: { not: null } },
      select: { mecanicoId: true, total: true },
      take: 5000,
    }),
  ]);

  // Comparativo mensal (6 meses)
  const meses = Array.from({ length: 6 }, (_, i) =>
    startOfMonth(subMonths(new Date(), 5 - i))
  );
  const mensal = meses.map((mes) => {
    const proximoMes = startOfMonth(subMonths(mes, -1));
    let receitas = 0;
    let despesas = 0;
    for (const lancamento of lancamentos) {
      if (!lancamento.pagoEm) continue;
      if (lancamento.pagoEm >= mes && lancamento.pagoEm < proximoMes) {
        if (lancamento.tipo === "RECEITA") receitas += paraNumero(lancamento.valor);
        else despesas += paraNumero(lancamento.valor);
      }
    }
    return {
      mes: format(mes, "MMM/yy", { locale: ptBR }),
      receitas: Math.round(receitas * 100) / 100,
      despesas: Math.round(despesas * 100) / 100,
    };
  });

  // Serviços mais vendidos
  const porServico = new Map<string, { quantidade: number; total: number }>();
  for (const servico of servicos) {
    const atual = porServico.get(servico.descricao) ?? { quantidade: 0, total: 0 };
    atual.quantidade += 1;
    atual.total += paraNumero(servico.valor);
    porServico.set(servico.descricao, atual);
  }
  const topServicos = [...porServico.entries()]
    .map(([nome, dados]) => ({
      nome,
      quantidade: dados.quantidade,
      total: Math.round(dados.total * 100) / 100,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // Peças mais utilizadas
  const porPeca = new Map<string, number>();
  for (const peca of pecas) {
    porPeca.set(
      peca.descricao,
      (porPeca.get(peca.descricao) ?? 0) + paraNumero(peca.quantidade)
    );
  }
  const topPecas = [...porPeca.entries()]
    .map(([nome, quantidade]) => ({
      nome,
      quantidade: Math.round(quantidade * 100) / 100,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // Ranking de mecânicos
  const porMecanico = new Map<string, { ordens: number; receita: number }>();
  for (const os of osFinalizadas) {
    const atual = porMecanico.get(os.mecanicoId!) ?? { ordens: 0, receita: 0 };
    atual.ordens += 1;
    atual.receita += paraNumero(os.total);
    porMecanico.set(os.mecanicoId!, atual);
  }
  const ids = [...porMecanico.keys()];
  const usuarios =
    ids.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
  const nomes = new Map(usuarios.map((u) => [u.id, u.name]));
  const rankingMecanicos = [...porMecanico.entries()]
    .map(([id, dados]) => ({
      nome: nomes.get(id) ?? "Mecânico",
      ordens: dados.ordens,
      receita: Math.round(dados.receita * 100) / 100,
    }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10);

  return { mensal, topServicos, topPecas, rankingMecanicos };
}
