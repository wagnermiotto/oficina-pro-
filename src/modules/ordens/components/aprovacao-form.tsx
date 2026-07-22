"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import { responderAprovacaoAction } from "../actions/aprovacao-publica-actions";
import { AssinaturaPad } from "@/shared/components/assinatura-pad";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface ItemAprovacao {
  tipo: "servico" | "peca";
  id: string;
  descricao: string;
  detalhe: string | null;
  valor: number;
}

interface AprovacaoFormProps {
  token: string;
  itens: ItemAprovacao[];
}

export function AprovacaoForm({ token, itens }: AprovacaoFormProps) {
  const router = useRouter();
  const [decisoes, setDecisoes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(itens.map((item) => [item.id, true]))
  );
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const assinaturaRef = useRef<string | null>(null);

  const totalAprovado = useMemo(
    () =>
      itens.reduce(
        (soma, item) => (decisoes[item.id] ? soma + item.valor : soma),
        0
      ),
    [itens, decisoes]
  );

  async function enviar() {
    if (nome.trim().length < 2) {
      toast.error("Informe seu nome completo para confirmar.");
      return;
    }
    setEnviando(true);
    const resultado = await responderAprovacaoAction(token, {
      nome: nome.trim(),
      decisoes: itens.map((item) => ({
        tipo: item.tipo,
        id: item.id,
        aprovado: Boolean(decisoes[item.id]),
      })),
      assinatura: assinaturaRef.current ?? undefined,
    });
    setEnviando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Resposta registrada. Obrigado!");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Itens do orçamento</CardTitle>
          <CardDescription>
            Toque em aprovar ou recusar em cada item. Você pode aprovar apenas
            parte do orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {itens.map((item) => {
            const aprovado = Boolean(decisoes[item.id]);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors",
                  aprovado
                    ? "border-chart-5/40 bg-chart-5/5"
                    : "border-destructive/30 bg-destructive/5 opacity-80"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.tipo === "servico" ? "Serviço" : "Peça"}
                    {item.detalhe ? ` · ${item.detalhe}` : ""}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {formatarMoeda(item.valor)}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={aprovado ? "default" : "outline"}
                    className={cn(
                      aprovado && "bg-chart-5 text-white hover:bg-chart-5/90"
                    )}
                    onClick={() =>
                      setDecisoes((d) => ({ ...d, [item.id]: true }))
                    }
                  >
                    <CircleCheck className="size-4" /> Aprovar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!aprovado ? "destructive" : "outline"}
                    onClick={() =>
                      setDecisoes((d) => ({ ...d, [item.id]: false }))
                    }
                  >
                    <CircleX className="size-4" /> Recusar
                  </Button>
                </div>
              </div>
            );
          })}
          <Separator className="my-3" />
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total aprovado</span>
            <span className="font-mono text-destaque">
              {formatarMoeda(totalAprovado)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmação</CardTitle>
          <CardDescription>
            Sua resposta tem valor de aceite. Registramos data, hora e IP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome-aprovador">Seu nome completo</Label>
            <Input
              id="nome-aprovador"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome de quem está aprovando"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Assinatura (opcional)</Label>
            <AssinaturaPad
              onChange={(dataUrl) => {
                assinaturaRef.current = dataUrl;
              }}
            />
          </div>
          <Button
            onClick={enviar}
            disabled={enviando}
            className="w-full bg-destaque text-destaque-foreground hover:bg-destaque/90"
            size="lg"
          >
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Confirmar resposta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
