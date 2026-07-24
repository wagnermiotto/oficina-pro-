"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusAssinatura } from "@prisma/client";
import { Loader2, MoreHorizontal, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  criarAssinaturaAction,
  definirVencimentoAction,
  mudarStatusAssinaturaAction,
  renovarAssinaturaAction,
  trocarPlanoAction,
} from "../actions/matriz-actions";
import { STATUS_ASSINATURA_MANUAL, STATUS_ASSINATURA_LABEL } from "../constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  oficinaId: string;
  temAssinatura: boolean;
  planoId: string | null;
  vencimento: string | null;
  planos: { id: string; nome: string }[];
}

export function OficinaAcoes({ oficinaId, temAssinatura, planoId, vencimento, planos }: Props) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);

  async function executar(fn: () => Promise<{ ok: boolean; erro?: string }>, msg: string) {
    setProcessando(true);
    const r = await fn();
    setProcessando(false);
    if (!r.ok) {
      toast.error(r.erro);
      return false;
    }
    toast.success(msg);
    router.refresh();
    return true;
  }

  if (!temAssinatura) {
    return <CriarAssinaturaDialog oficinaId={oficinaId} planos={planos} executar={executar} processando={processando} />;
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={processando}
        onClick={() => executar(() => renovarAssinaturaAction(oficinaId), "Pagamento registrado. Vencimento +30 dias.")}
      >
        {processando ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
        Renovar
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Mais ações">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <VencimentoDialog
            oficinaId={oficinaId}
            atual={vencimento}
            executar={executar}
            processando={processando}
          />
          <TrocarPlanoDialog
            oficinaId={oficinaId}
            planoId={planoId}
            planos={planos}
            executar={executar}
            processando={processando}
          />
          <DropdownMenuSeparator />
          {STATUS_ASSINATURA_MANUAL.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() =>
                executar(() => mudarStatusAssinaturaAction(oficinaId, s), `Status: ${STATUS_ASSINATURA_LABEL[s]}.`)
              }
              variant={s === "BLOQUEADO" || s === "SUSPENSO" || s === "CANCELADO" ? "destructive" : "default"}
            >
              Marcar como {STATUS_ASSINATURA_LABEL[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type Executar = (fn: () => Promise<{ ok: boolean; erro?: string }>, msg: string) => Promise<boolean>;

function CriarAssinaturaDialog({
  oficinaId,
  planos,
  executar,
  processando,
}: {
  oficinaId: string;
  planos: { id: string; nome: string }[];
  executar: Executar;
  processando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [planoId, setPlanoId] = useState(planos[0]?.id ?? "");
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Definir plano</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Definir plano da oficina</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label>Plano</Label>
          <Select value={planoId} onValueChange={setPlanoId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            disabled={processando || !planoId}
            onClick={async () => {
              const ok = await executar(() => criarAssinaturaAction(oficinaId, planoId), "Assinatura criada (ativa, +30 dias).");
              if (ok) setAberto(false);
            }}
          >
            {processando && <Loader2 className="size-4 animate-spin" />} Ativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VencimentoDialog({
  oficinaId,
  atual,
  executar,
  processando,
}: {
  oficinaId: string;
  atual: string | null;
  executar: Executar;
  processando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(atual ?? "");
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Definir vencimento</DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Definir vencimento</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label>Nova data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            disabled={processando || !data}
            onClick={async () => {
              const ok = await executar(() => definirVencimentoAction(oficinaId, data), "Vencimento atualizado.");
              if (ok) setAberto(false);
            }}
          >
            {processando && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrocarPlanoDialog({
  oficinaId,
  planoId,
  planos,
  executar,
  processando,
}: {
  oficinaId: string;
  planoId: string | null;
  planos: { id: string; nome: string }[];
  executar: Executar;
  processando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [novo, setNovo] = useState(planoId ?? planos[0]?.id ?? "");
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Trocar plano</DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Trocar plano</DialogTitle></DialogHeader>
        <div className="space-y-1.5">
          <Label>Plano</Label>
          <Select value={novo} onValueChange={setNovo}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            disabled={processando || !novo}
            onClick={async () => {
              const ok = await executar(() => trocarPlanoAction(oficinaId, novo), "Plano atualizado.");
              if (ok) setAberto(false);
            }}
          >
            {processando && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
