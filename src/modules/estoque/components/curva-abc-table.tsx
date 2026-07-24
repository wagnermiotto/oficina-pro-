import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarMoeda } from "@/shared/utils/moeda";
import { cn } from "@/lib/utils";
import type { curvaAbc } from "../services/estoque-service";

type CurvaAbc = Awaited<ReturnType<typeof curvaAbc>>;

const CLASSE_BADGE: Record<string, string> = {
  A: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  B: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  C: "bg-muted text-muted-foreground border-border",
};

const CLASSE_DESCRICAO: Record<string, string> = {
  A: "Alto valor — controle rígido",
  B: "Valor intermediário",
  C: "Baixo valor / sem giro",
};

export function CurvaAbcTable({ curva }: { curva: CurvaAbc }) {
  if (curva.itens.length === 0) {
    return (
      <p className="rounded-lg border p-8 text-center text-muted-foreground">
        Nenhuma peça ativa para analisar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Classificação por valor de consumo (saídas dos últimos 180 dias).
        Priorize a classe A nas contagens e negociações de compra.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        {curva.resumo.map((r) => (
          <div key={r.classe} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn("font-semibold", CLASSE_BADGE[r.classe])}>
                Classe {r.classe}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {r.percentValor}% do valor
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold">{r.qtdItens}</p>
            <p className="text-xs text-muted-foreground">
              {r.qtdItens === 1 ? "item" : "itens"} · {formatarMoeda(r.valor)} ·{" "}
              {CLASSE_DESCRICAO[r.classe]}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">Classe</TableHead>
              <TableHead>Peça</TableHead>
              <TableHead className="text-right">Consumo (180d)</TableHead>
              <TableHead className="text-right">% acum.</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {curva.itens.map((item) => (
              <TableRow key={item.pecaId}>
                <TableCell>
                  <Badge variant="outline" className={cn("font-semibold", CLASSE_BADGE[item.classe])}>
                    {item.classe}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {item.nome}
                  {item.codigo ? (
                    <span className="ml-1 text-xs text-muted-foreground">{item.codigo}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatarMoeda(item.valorConsumo)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {item.acumulado}%
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono",
                    item.quantidade <= item.estoqueMinimo && "text-destructive"
                  )}
                >
                  {item.quantidade} {item.unidade}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
