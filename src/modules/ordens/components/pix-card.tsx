"use client";

import { useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PixCard({ codigo, valor }: { codigo: string; valor: number }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
    toast.success("Código PIX copiado! Envie ao cliente.");
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="size-4 text-chart-5" /> Receber por PIX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cobrança de <span className="font-semibold text-foreground">{formatarMoeda(valor)}</span>.
          O cliente cola este código no app do banco.
        </p>
        <div className="rounded-md border bg-muted/40 p-2">
          <p className="break-all font-mono text-xs text-muted-foreground">{codigo}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={copiar} className="flex-1">
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "Copiado" : "Copiar código PIX"}
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Segue o PIX de ${formatarMoeda(valor)} para pagamento:\n\n${codigo}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
