import type { Metadata } from "next";
import { Suspense } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { StatusLancamento, TipoLancamento } from "@prisma/client";
import { requireOficina } from "@/shared/lib/session";
import { prisma } from "@/shared/lib/prisma";
import {
  listarComissoes,
  listarLancamentos,
  resumoFinanceiro,
} from "@/modules/financeiro/services/financeiro-service";
import { LancamentoDialog } from "@/modules/financeiro/components/lancamento-dialog";
import {
  FiltrosLancamentos,
  LancamentosTable,
} from "@/modules/financeiro/components/lancamentos-table";
import { ComissoesTable } from "@/modules/financeiro/components/comissoes-table";
import { KpiCard } from "@/modules/dashboard/components/kpi-card";
import { BuscaInput } from "@/shared/components/busca-input";
import { Paginacao } from "@/shared/components/paginacao";
import { formatarMoeda, paraNumero } from "@/shared/utils/moeda";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Financeiro" };

interface Props {
  searchParams: Promise<{
    busca?: string;
    pagina?: string;
    tipo?: string;
    status?: string;
  }>;
}

async function ConteudoFinanceiro({ searchParams }: Props) {
  const { db } = await requireOficina();
  const params = await searchParams;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const tipo = ["RECEITA", "DESPESA"].includes(params.tipo ?? "")
    ? (params.tipo as TipoLancamento)
    : undefined;
  const status = ["PENDENTE", "PAGO", "CANCELADO"].includes(params.status ?? "")
    ? (params.status as StatusLancamento)
    : undefined;

  const [resumo, lancamentos, comissoes, centrosCusto] = await Promise.all([
    resumoFinanceiro(db),
    listarLancamentos(db, { pagina, tipo, status, busca: params.busca }),
    listarComissoes(db),
    db.centroCusto.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const usuarios =
    comissoes.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: [...new Set(comissoes.map((c) => c.usuarioId))] } },
          select: { id: true, name: true },
        })
      : [];
  const nomes = new Map(usuarios.map((u) => [u.id, u.name]));
  const hoje = startOfDay(new Date());

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          titulo="Receitas do mês"
          valor={formatarMoeda(resumo.receitasMes)}
          icone={ArrowUpCircle}
        />
        <KpiCard
          titulo="Despesas do mês"
          valor={formatarMoeda(resumo.despesasMes)}
          icone={ArrowDownCircle}
        />
        <KpiCard
          titulo="Lucro do mês"
          valor={formatarMoeda(resumo.lucroMes)}
          icone={TrendingUp}
          destaque
        />
        <KpiCard
          titulo="A receber"
          valor={formatarMoeda(resumo.aReceber)}
          icone={Banknote}
          descricao={resumo.vencidos > 0 ? `${resumo.vencidos} vencido(s)` : undefined}
          alerta={resumo.vencidos > 0}
        />
        <KpiCard
          titulo="A pagar"
          valor={formatarMoeda(resumo.aPagar)}
          icone={Wallet}
        />
      </div>

      <Tabs defaultValue="lancamentos">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
            <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          </TabsList>
          <LancamentoDialog
            centrosCusto={centrosCusto.map((c) => ({ id: c.id, nome: c.nome }))}
          />
        </div>

        <TabsContent value="lancamentos" className="space-y-4 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <Suspense>
              <BuscaInput placeholder="Buscar por descrição..." />
              <FiltrosLancamentos />
            </Suspense>
          </div>
          <LancamentosTable
            dados={lancamentos.itens.map((lancamento) => ({
              id: lancamento.id,
              tipo: lancamento.tipo,
              descricao: lancamento.descricao,
              valor: paraNumero(lancamento.valor),
              status: lancamento.status,
              vencimento: lancamento.vencimento
                ? format(lancamento.vencimento, "dd/MM/yyyy")
                : null,
              pagoEm: lancamento.pagoEm
                ? format(lancamento.pagoEm, "dd/MM/yyyy")
                : null,
              formaPagamento: lancamento.formaPagamento,
              vinculo: lancamento.ordemServico
                ? `OS #${String(lancamento.ordemServico.numero).padStart(4, "0")}`
                : (lancamento.cliente?.nome ??
                  lancamento.fornecedor?.nome ??
                  lancamento.centroCusto?.nome ??
                  null),
              osId: lancamento.ordemServico?.id ?? null,
              vencido: Boolean(
                lancamento.status === "PENDENTE" &&
                  lancamento.vencimento &&
                  isBefore(lancamento.vencimento, hoje)
              ),
            }))}
          />
          <Paginacao
            pagina={pagina}
            totalPaginas={lancamentos.totalPaginas}
            totalRegistros={lancamentos.total}
          />
        </TabsContent>

        <TabsContent value="comissoes" className="pt-3">
          <ComissoesTable
            dados={comissoes.map((comissao) => ({
              id: comissao.id,
              mecanico: nomes.get(comissao.usuarioId) ?? "Mecânico",
              osId: comissao.ordemServico.id,
              osNumero: comissao.ordemServico.numero,
              percentual: paraNumero(comissao.percentual),
              valor: paraNumero(comissao.valor),
              status: comissao.status,
              pagaEm: comissao.pagaEm ? format(comissao.pagaEm, "dd/MM/yyyy") : null,
            }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function FinanceiroPage(props: Props) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ConteudoFinanceiro {...props} />
      </Suspense>
    </div>
  );
}
