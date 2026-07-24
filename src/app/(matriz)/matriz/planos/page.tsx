import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { requireSuperAdmin } from "@/shared/lib/session";
import { listarPlanos } from "@/modules/plataforma/services/matriz-service";
import { formatarMoeda, paraNumero } from "@/shared/utils/moeda";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Planos · Matriz" };

const RECURSO_LABEL: Record<string, string> = {
  max_users: "Usuários",
  max_branches: "Filiais",
  max_storage_gb: "Armazenamento (GB)",
  ia_enabled: "Inteligência artificial",
  bi_enabled: "Business Intelligence (BI)",
};

const ORDEM = ["max_users", "max_branches", "max_storage_gb", "bi_enabled", "ia_enabled"];

function valorRecurso(chave: string, valor: string) {
  if (valor === "true") return <Check className="size-4 text-chart-5" />;
  if (valor === "false") return <X className="size-4 text-muted-foreground" />;
  return <span className="font-mono text-sm">{valor}</span>;
}

export default async function PlanosMatrizPage() {
  await requireSuperAdmin();
  const planos = await listarPlanos();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Planos</h1>
        <p className="text-sm text-muted-foreground">
          Os planos comerciais da plataforma e os limites de cada um.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planos.map((plano) => {
          const mapa = new Map(plano.recursos.map((r) => [r.chave, r.valor]));
          return (
            <Card key={plano.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plano.nome}</CardTitle>
                  {plano.ativo ? null : (
                    <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">
                  {formatarMoeda(paraNumero(plano.precoMensal))}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
                <p className="text-xs text-muted-foreground">{plano.descricao}</p>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 border-t pt-4">
                {ORDEM.map((chave) => (
                  <div key={chave} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{RECURSO_LABEL[chave] ?? chave}</span>
                    {valorRecurso(chave, mapa.get(chave) ?? "false")}
                  </div>
                ))}
                <div className="border-t pt-2 text-xs text-muted-foreground">
                  {plano._count.assinaturas} oficina(s) neste plano
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
