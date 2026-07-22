import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  titulo: string;
  valor: string;
  descricao?: string;
  icone: LucideIcon;
  destaque?: boolean;
  alerta?: boolean;
}

export function KpiCard({
  titulo,
  valor,
  descricao,
  icone: Icone,
  destaque,
  alerta,
}: KpiCardProps) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4 px-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            destaque
              ? "bg-destaque/15 text-destaque"
              : alerta
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary dark:bg-primary/20"
          )}
        >
          <Icone className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {titulo}
          </p>
          <p className="truncate text-xl font-bold tracking-tight">{valor}</p>
          {descricao ? (
            <p className="truncate text-xs text-muted-foreground">{descricao}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
