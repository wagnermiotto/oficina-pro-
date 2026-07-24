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
  Link2,
  Loader2,
  Send,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { TRANSICOES_OS } from "../services/os-regras";
import {
  gerarLinkAprovacaoAction,
  gerarLinkPortalAction,
  mudarStatusOSAction,
} from "../actions/os-actions";
import { gerarLinkNpsAction } from "@/modules/crm/actions/crm-actions";
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
  const [linkNps, setLinkNps] = useState<string | null>(null);
  const [linkPortal, setLinkPortal] = useState<string | null>(null);
  const transicoes = TRANSICOES_OS[status];
  const podeAvaliar =
    status === "CONCLUIDO" || status === "ENTREGUE" || status === "FINALIZADO";

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

  async function gerarNps() {
    setProcessando(true);
    const resultado = await gerarLinkNpsAction(osId);
    setProcessando(false);
    if (!resultado.ok || !resultado.url) {
      toast.error(resultado.erro ?? "Não foi possível gerar o link.");
      return;
    }
    setLinkNps(resultado.url);
  }

  async function copiarNps() {
    if (!linkNps) return;
    await navigator.clipboard.writeText(linkNps);
    toast.success("Link copiado! Envie ao cliente por WhatsApp.");
  }

  async function gerarPortal() {
    setProcessando(true);
    const resultado = await gerarLinkPortalAction(osId);
    setProcessando(false);
    if (!resultado.ok || !resultado.url) {
      toast.error(resultado.erro ?? "Não foi possível gerar o link.");
      return;
    }
    setLinkPortal(resultado.url);
  }

  async function copiarPortal() {
    if (!linkPortal) return;
    await navigator.clipboard.writeText(linkPortal);
    toast.success("Link do portal copiado!");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" asChild>
        <a href={`/ordens/${osId}/pdf`} target="_blank" rel="noreferrer">
          <FileText className="size-4" /> PDF
        </a>
      </Button>

      <Button variant="outline" onClick={gerarPortal} disabled={processando}>
        {processando ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
        Portal do cliente
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

      {podeAvaliar && (
        <Button
          variant="outline"
          onClick={gerarNps}
          disabled={processando}
          className="border-chart-5/40 text-chart-5 hover:bg-chart-5/10 hover:text-chart-5"
        >
          {processando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Star className="size-4" />
          )}
          Pesquisa de satisfação
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

      <Dialog
        open={Boolean(linkNps)}
        onOpenChange={(aberto) => !aberto && setLinkNps(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link da pesquisa de satisfação</DialogTitle>
            <DialogDescription>
              Envie ao cliente após a entrega. Ele dá uma nota de 0 a 10 sem
              precisar de login. O resultado aparece no CRM (aba Satisfação).
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={linkNps ?? ""} className="font-mono text-xs" />
            <Button onClick={copiarNps} size="icon" aria-label="Copiar link">
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" asChild>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Olá! Que tal avaliar seu atendimento? Leva 10 segundos: ${linkNps ?? ""}`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <Send className="size-4" /> Enviar por WhatsApp
              </a>
            </Button>
            <Button variant="outline" onClick={() => setLinkNps(null)}>
              <Check className="size-4" /> Concluído
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(linkPortal)}
        onOpenChange={(aberto) => !aberto && setLinkPortal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Portal do cliente</DialogTitle>
            <DialogDescription>
              Link único para o cliente acompanhar a OS (status, itens e
              histórico do veículo) sem precisar de login. Envie por WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={linkPortal ?? ""} className="font-mono text-xs" />
            <Button onClick={copiarPortal} size="icon" aria-label="Copiar link">
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" asChild>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Acompanhe o serviço do seu veículo em tempo real: ${linkPortal ?? ""}`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <Send className="size-4" /> Enviar por WhatsApp
              </a>
            </Button>
            <Button variant="outline" onClick={() => setLinkPortal(null)}>
              <Check className="size-4" /> Concluído
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
