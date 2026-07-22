import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmConstrucao({ modulo, fase }: { modulo: string; fase: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-destaque/15 text-destaque">
          <Construction className="size-6" />
        </div>
        <p className="text-lg font-semibold">{modulo}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Este módulo será liberado na Fase {fase} do desenvolvimento. A
          estrutura do banco de dados já está pronta para recebê-lo.
        </p>
      </CardContent>
    </Card>
  );
}
