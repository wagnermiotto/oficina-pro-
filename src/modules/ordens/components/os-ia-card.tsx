"use client";

import { useState } from "react";
import { Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  gerarMensagemWhatsAppIAAction,
  sugerirDiagnosticoIAAction,
} from "../actions/ia-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function OSIACard({ osId }: { osId: string }) {
  const [gerando, setGerando] = useState<"diagnostico" | "mensagem" | null>(null);
  const [resultado, setResultado] = useState("");

  async function executar(tipo: "diagnostico" | "mensagem") {
    setGerando(tipo);
    const acao =
      tipo === "diagnostico"
        ? sugerirDiagnosticoIAAction
        : gerarMensagemWhatsAppIAAction;
    const resposta = await acao(osId);
    setGerando(null);
    if (!resposta.ok || !resposta.texto) {
      toast.error(resposta.erro ?? "A IA não respondeu.");
      return;
    }
    setResultado(resposta.texto);
  }

  async function copiar() {
    await navigator.clipboard.writeText(resultado);
    toast.success("Copiado para a área de transferência.");
  }

  return (
    <Card className="border-destaque/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-destaque" /> Assistente IA
        </CardTitle>
        <CardDescription>
          Sugestões geradas por IA — sempre confirme com inspeção física.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={gerando !== null}
            onClick={() => executar("diagnostico")}
          >
            {gerando === "diagnostico" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Sugerir diagnóstico
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={gerando !== null}
            onClick={() => executar("mensagem")}
          >
            {gerando === "mensagem" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            Mensagem p/ WhatsApp
          </Button>
        </div>
        {resultado ? (
          <div className="space-y-2">
            <Textarea
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              rows={10}
              className="text-sm"
            />
            <Button variant="ghost" size="sm" onClick={copiar}>
              <Copy className="size-4" /> Copiar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
