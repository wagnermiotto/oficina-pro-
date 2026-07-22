import type { Metadata } from "next";
import {
  AlertTriangle,
  Banknote,
  Car,
  ClipboardCheck,
  PackageSearch,
  Receipt,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { requireOficina } from "@/shared/lib/session";
import { formatarMoeda } from "@/shared/utils/moeda";
import { obterResumoDashboard } from "@/modules/dashboard/services/dashboard-service";
import { KpiCard } from "@/modules/dashboard/components/kpi-card";
import { FluxoChart } from "@/modules/dashboard/components/fluxo-chart";
import { StatusChart } from "@/modules/dashboard/components/status-chart";
import { OSRecentes } from "@/modules/dashboard/components/os-recentes";
import { AgendaDoDia } from "@/modules/dashboard/components/agenda-do-dia";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { db } = await requireOficina();
  const resumo = await obterResumoDashboard(db);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Veículos na oficina"
          valor={String(resumo.veiculosNaOficina)}
          descricao={`${resumo.ordensAbertas} ordens abertas`}
          icone={Car}
        />
        <KpiCard
          titulo="Aguardando aprovação"
          valor={String(resumo.aguardandoAprovacao)}
          descricao={`${resumo.aguardandoPecas} aguardando peças`}
          icone={ClipboardCheck}
          destaque
        />
        <KpiCard
          titulo="Receita hoje"
          valor={formatarMoeda(resumo.receitaDia)}
          descricao={`${formatarMoeda(resumo.receitaMes)} no mês`}
          icone={Banknote}
        />
        <KpiCard
          titulo="Lucro do mês"
          valor={formatarMoeda(resumo.lucroMes)}
          descricao={`Despesas: ${formatarMoeda(resumo.despesaMes)}`}
          icone={TrendingUp}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Ticket médio (mês)"
          valor={formatarMoeda(resumo.ticketMedioMes)}
          icone={Receipt}
        />
        <KpiCard
          titulo="Estoque baixo"
          valor={String(resumo.estoqueBaixo)}
          descricao={resumo.estoqueBaixo > 0 ? "Itens abaixo do mínimo" : "Tudo em dia"}
          icone={resumo.estoqueBaixo > 0 ? AlertTriangle : PackageSearch}
          alerta={resumo.estoqueBaixo > 0}
        />
        <KpiCard
          titulo="Em execução"
          valor={String(
            resumo.osPorStatus.find((s) => s.status === "EM_EXECUCAO")
              ?.quantidade ?? 0
          )}
          icone={Wrench}
        />
        <KpiCard
          titulo="Agendamentos hoje"
          valor={String(resumo.agendamentosHoje.length)}
          icone={ClipboardCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FluxoChart dados={resumo.fluxoDiario} />
        <StatusChart dados={resumo.osPorStatus} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <OSRecentes ordens={resumo.osRecentes} />
        <AgendaDoDia itens={resumo.agendamentosHoje} />
      </div>
    </div>
  );
}
