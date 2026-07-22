import type { Metadata } from "next";
import { Suspense } from "react";
import { FileSpreadsheet } from "lucide-react";
import { requireOficina } from "@/shared/lib/session";
import { obterResumoBI } from "@/modules/relatorios/services/bi-service";
import { BIConteudo } from "@/modules/relatorios/components/bi-charts";
import { RelatorioCard } from "@/modules/relatorios/components/relatorio-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Relatórios e BI" };

async function BISecao() {
  const { db } = await requireOficina();
  const resumo = await obterResumoBI(db);
  return <BIConteudo resumo={resumo} />;
}

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="bi">
        <TabsList>
          <TabsTrigger value="bi">Business Intelligence</TabsTrigger>
          <TabsTrigger value="exportar">Exportações</TabsTrigger>
        </TabsList>

        <TabsContent value="bi" className="pt-3">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
            <BISecao />
          </Suspense>
        </TabsContent>

        <TabsContent value="exportar" className="space-y-6 pt-3">
          <Card className="py-4">
            <CardContent className="flex items-center gap-3 px-4 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-5 shrink-0 text-destaque" />
              <p>
                Os relatórios são exportados em CSV compatível com Excel
                (separador “;”, acentuação preservada). Relatórios com período
                usam a data de pagamento/vencimento ou de entrada, conforme o
                caso.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <RelatorioCard
              titulo="Financeiro"
              descricao="Receitas, despesas, status e formas de pagamento"
              tipo="lancamentos"
            />
            <RelatorioCard
              titulo="Ordens de serviço"
              descricao="Todas as OS com cliente, veículo, status e total"
              tipo="ordens"
            />
            <RelatorioCard
              titulo="Estoque"
              descricao="Posição atual: saldos, mínimos, custos e localização"
              tipo="estoque"
              comPeriodo={false}
            />
            <RelatorioCard
              titulo="Clientes"
              descricao="Base completa com contatos e vínculos"
              tipo="clientes"
              comPeriodo={false}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
