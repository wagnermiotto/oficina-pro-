import Link from "next/link";
import { CalendarClock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AgendamentoDia } from "../types";

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  REVISAO: "Revisão",
  TROCA_OLEO: "Troca de óleo",
  ENTREGA: "Entrega",
  RETORNO: "Retorno",
  ORCAMENTO: "Orçamento",
  OUTRO: "Compromisso",
};

export function AgendaDoDia({ itens }: { itens: AgendamentoDia[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda de hoje</CardTitle>
        <CardDescription>Próximos compromissos</CardDescription>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem compromissos hoje.{" "}
            <Link href="/agenda" className="text-destaque hover:underline">
              Abrir agenda
            </Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {itens.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                  <CalendarClock className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {TIPO_LABEL[item.tipo] ?? item.tipo}
                    {item.cliente ? ` · ${item.cliente}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-destaque">
                  {item.horario}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
