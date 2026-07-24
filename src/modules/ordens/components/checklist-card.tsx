"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatusChecklist } from "@prisma/client";
import { CircleCheck, CircleDot, ClipboardCheck, Loader2, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  atualizarChecklistAction,
  iniciarChecklistAction,
} from "../actions/os-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ItemChecklist {
  id: string;
  item: string;
  status: StatusChecklist;
}

const OPCOES: { valor: StatusChecklist; label: string; icone: typeof CircleCheck; classe: string }[] = [
  { valor: "OK", label: "OK", icone: CircleCheck, classe: "text-chart-5 border-chart-5/40 bg-chart-5/10" },
  { valor: "ATENCAO", label: "Atenção", icone: TriangleAlert, classe: "text-destaque border-destaque/40 bg-destaque/10" },
  { valor: "REPROVADO", label: "Reprovado", icone: XCircle, classe: "text-destructive border-destructive/40 bg-destructive/10" },
];

export function ChecklistCard({
  osId,
  itens,
  editavel,
}: {
  osId: string;
  itens: ItemChecklist[];
  editavel: boolean;
}) {
  const router = useRouter();
  const [iniciando, startIniciar] = useTransition();
  const [local, setLocal] = useState(itens);

  async function iniciar() {
    startIniciar(async () => {
      const r = await iniciarChecklistAction(osId);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      router.refresh();
    });
  }

  async function marcar(itemId: string, status: StatusChecklist) {
    setLocal((prev) => prev.map((i) => (i.id === itemId ? { ...i, status } : i)));
    const r = await atualizarChecklistAction(osId, itemId, status);
    if (!r.ok) {
      toast.error(r.erro);
      router.refresh();
    }
  }

  const preenchidos = local.filter((i) => i.status !== "NAO_VERIFICADO").length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="size-4 text-chart-2" /> Inspeção (checklist)
        </CardTitle>
        {local.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {preenchidos}/{local.length} verificados
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        {local.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Gere o checklist padrão do tipo do veículo para inspecionar item a item.
            </p>
            {editavel ? (
              <Button variant="outline" onClick={iniciar} disabled={iniciando}>
                {iniciando ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
                Iniciar inspeção
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1.5">
            {local.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                <CircleDot
                  className={cn(
                    "size-3.5 shrink-0",
                    item.status === "OK" && "text-chart-5",
                    item.status === "ATENCAO" && "text-destaque",
                    item.status === "REPROVADO" && "text-destructive",
                    item.status === "NAO_VERIFICADO" && "text-muted-foreground/40"
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{item.item}</span>
                {editavel ? (
                  <div className="flex shrink-0 gap-1">
                    {OPCOES.map(({ valor, label, icone: Icone, classe }) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => marcar(item.id, valor)}
                        aria-label={label}
                        title={label}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md border transition-colors",
                          item.status === valor ? classe : "text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <Icone className="size-4" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {OPCOES.find((o) => o.valor === item.status)?.label ?? "—"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
