import type { Metadata } from "next";
import {
  Boxes,
  FileSpreadsheet,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { RelatorioCard } from "@/modules/relatorios/components/relatorio-card";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <Card className="py-4">
        <CardContent className="flex items-center gap-3 px-4 text-sm text-muted-foreground">
          <FileSpreadsheet className="size-5 shrink-0 text-destaque" />
          <p>
            Os relatórios são exportados em CSV compatível com Excel (separador
            “;”, acentuação preservada). Relatórios com período usam a data de
            pagamento/vencimento ou de entrada, conforme o caso.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <RelatorioCard
          titulo="Financeiro"
          descricao="Receitas, despesas, status e formas de pagamento"
          tipo="lancamentos"
          icone={Wallet}
        />
        <RelatorioCard
          titulo="Ordens de serviço"
          descricao="Todas as OS com cliente, veículo, status e total"
          tipo="ordens"
          icone={Wrench}
        />
        <RelatorioCard
          titulo="Estoque"
          descricao="Posição atual: saldos, mínimos, custos e localização"
          tipo="estoque"
          icone={Boxes}
          comPeriodo={false}
        />
        <RelatorioCard
          titulo="Clientes"
          descricao="Base completa com contatos e vínculos"
          tipo="clientes"
          icone={Users}
          comPeriodo={false}
        />
      </div>
    </div>
  );
}
