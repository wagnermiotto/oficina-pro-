"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusOS } from "@prisma/client";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { TRANSICOES_OS } from "../services/os-regras";
import {
  gerarLinkAprovacaoAction,
  mudarStatusOSAction,
} from "../actions/os-actions";
import { STATUS_OS_LABEL } from "@/shared/constants/os";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface OSStatusAcoesProps {
  osId: string;
  status: StatusOS;
}

export function OSStatusAcoes({ osId, status }: OSStatusAcoesProps) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const [linkAprovacao, setLinkAprovacao] = useState<string | null>(null);
  const transicoes = TRANSICOES_OS[status];

  async function mudarStatus(novo: StatusOS) {
    setProcessando(true);
    const resultado = await mudarStatusOSAction(osId, novo);
    setProcessando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(`Status alterado para ${STATUS_OS_LABEL[novo]}.`);
    router.refresh();
  }

  async function gerarLink() {
    setProcessando(true);
    const resultado = await gerarLinkAprovacaoAction(osId);
    setProcessando(false);
    if (!resultado.ok || !resultado.url) {
      toast.error(resultado.erro ?? "Não foi possível gerar o link.");
      return;
    }
    setLinkAprovacao(resultado.url);
    router.refresh();
  }

  async function copiarLink() {
    if (!linkAprovacao) return;
    await navigator.clipboard.writeText(linkAprovacao);
    toast.success("Link copiado! Envie por WhatsApp ou e-mail.");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" asChild>
        <a href={`/ordens/${osId}/pdf`} target="_blank" rel="noreferrer">
          <FileText className="size-4" /> PDF
        </a>
      </Button>

      {(status === "RECEBIDO" ||
        status === "DIAGNOSTICO" ||
        status === "AGUARDANDO_APROVACAO") && (
        <Button
          variant="outline"
          onClick={gerarLink}
          disabled={processando}
          className="border-destaque/40 text-destaque hover:bg-destaque/10 hover:text-destaque"
        >
          {processando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Enviar para aprovação
        </Button>
      )}

      {transicoes.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={processando}>
              Mudar status <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {transicoes.map((novo) => (
              <DropdownMenuItem
                key={novo}
                onClick={() => mudarStatus(novo)}
                variant={novo === "CANCELADO" ? "destructive" : "default"}
              >
                <ArrowRight className="size-4" />
                {STATUS_OS_LABEL[novo]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog
        open={Boolean(linkAprovacao)}
        onOpenChange={(aberto) => !aberto && setLinkAprovacao(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de aprovação gerado</DialogTitle>
            <DialogDescription>
              Envie este link ao cliente por WhatsApp ou e-mail. Ele poderá
              aprovar ou recusar cada item sem precisar de login. Validade: 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={linkAprovacao ?? ""} className="font-mono text-xs" />
            <Button onClick={copiarLink} size="icon" aria-label="Copiar link">
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setLinkAprovacao(null)}>
              <Check className="size-4" /> Concluído
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
