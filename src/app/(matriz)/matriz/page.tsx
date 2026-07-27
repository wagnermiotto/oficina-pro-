import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  Building2,
  CircleDollarSign,
  FlaskConical,
  Lock,
  TrendingUp,
} from "lucide-react";
import { requireSuperAdmin } from "@/shared/lib/session";
import { resumoMatriz } from "@/modules/plataforma/services/matriz-service";
import { PlanoChart } from "@/modules/plataforma/components/plano-chart";
import { STATUS_ASSINATURA_BADGE, STATUS_ASSINATURA_LABEL } from "@/modules/plataforma/constants";
import { KpiCard } from "@/modules/dashboard/components/kpi-card";
import { formatarMoeda } from "@/shared/utils/moeda";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Matriz" };

export default async function MatrizDashboardPage() {
  await requireSuperAdmin();
  const r = await resumoMatriz();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Visão geral da plataforma</h1>
        <p className="text-sm text-muted-foreground">
          Gestão de todas as oficinas, planos e cobrança.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Oficinas ativas" valor={String(r.ativas)} icone={Building2}
          descricao={`${r.totalOficinas} no total`} />
        <KpiCard titulo="Receita mensal (ativas)" valor={formatarMoeda(r.receitaAtiva)}
          icone={CircleDollarSign} />
        <KpiCard titulo="Atrasadas / Bloqueadas" valor={`${r.atrasadas} / ${r.bloqueadas}`}
          icone={Lock} alerta={r.atrasadas + r.bloqueadas > 0}
          descricao={r.suspensas > 0 ? `${r.suspensas} suspensa(s)` : undefined} />
        <KpiCard titulo="Novas oficinas (90d)" valor={String(r.novas90)}
          icone={TrendingUp} descricao={`${r.novas30} nos últimos 30 dias`} />
        <KpiCard titulo="Em teste (pendentes)" valor={String(r.pendentes)}
          icone={FlaskConical} />
        <KpiCard titulo="Acessos (7 dias)" valor={String(r.acessos7d)}
          icone={Activity} descricao="Logins auditados na plataforma" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PlanoChart dados={r.porPlano} />

        <Card>
          <CardHeader>
            <CardTitle>Vencimentos a acompanhar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.vencendo.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum vencimento pendente. Tudo em dia.
              </p>
            ) : (
              r.vencendo.map((v) => (
                <Link
                  key={v.oficinaId}
                  href="/matriz/oficinas"
                  className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-accent"
                >
                  <span className="font-medium">{v.plano}</span>
                  <span className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("font-normal", STATUS_ASSINATURA_BADGE[v.status])}>
                      {STATUS_ASSINATURA_LABEL[v.status]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {format(v.vencimento, "dd/MM/yyyy")}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
