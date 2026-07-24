"use client";

import { useState } from "react";
import { CircleCheck, Loader2 } from "lucide-react";
import { responderNpsAction } from "../actions/nps-publica-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function NpsForm({ token }: { token: string }) {
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    if (nota === null) {
      setErro("Escolha uma nota de 0 a 10.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const resultado = await responderNpsAction(token, { nota, comentario });
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível registrar.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CircleCheck className="size-12 text-chart-5" />
        <p className="text-lg font-semibold">Obrigado pela sua avaliação!</p>
        <p className="text-sm text-muted-foreground">
          Seu retorno ajuda a oficina a melhorar cada vez mais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="grid grid-cols-11 gap-1.5">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setNota(i);
                setErro(null);
              }}
              className={cn(
                "flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                nota === i
                  ? "border-destaque bg-destaque text-destaque-foreground"
                  : "hover:bg-accent",
                i <= 6 && nota === i && "border-destructive bg-destructive",
                i >= 9 && nota === i && "border-chart-5 bg-chart-5"
              )}
              aria-label={`Nota ${i}`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Não recomendaria</span>
          <span>Recomendaria com certeza</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Quer deixar um comentário? (opcional)
        </label>
        <Textarea
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Conte como foi sua experiência..."
        />
      </div>

      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      <Button onClick={enviar} disabled={enviando} className="w-full" size="lg">
        {enviando && <Loader2 className="size-4 animate-spin" />}
        Enviar avaliação
      </Button>
    </div>
  );
}
