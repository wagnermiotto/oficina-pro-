"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { registrarMovimentacaoAction } from "../actions/estoque-actions";
import { TIPO_MOVIMENTACAO_LABEL } from "../schemas/estoque-schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface PecaOpcao {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

interface MovimentacaoDialogProps {
  pecas: PecaOpcao[];
  pecaInicialId?: string;
  trigger?: React.ReactNode;
}

export function MovimentacaoDialog({
  pecas,
  pecaInicialId,
  trigger,
}: MovimentacaoDialogProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pecaId, setPecaId] = useState(pecaInicialId ?? "");
  const [tipo, setTipo] = useState("ENTRADA");
  const [quantidade, setQuantidade] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [motivo, setMotivo] = useState("");

  const pecaSelecionada = pecas.find((p) => p.id === pecaId);

  async function salvar() {
    setSalvando(true);
    const resultado = await registrarMovimentacaoAction({
      pecaId,
      tipo: tipo as "ENTRADA",
      quantidade,
      custoUnitario: custoUnitario || undefined,
      motivo,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Movimentação registrada.");
    setAberto(false);
    setQuantidade("");
    setMotivo("");
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <ArrowLeftRight className="size-4" /> Movimentação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentação de estoque</DialogTitle>
          <DialogDescription>
            Entrada, saída manual ou ajuste de saldo (contagem de inventário).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Peça</Label>
            <Select value={pecaId} onValueChange={setPecaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar peça..." />
              </SelectTrigger>
              <SelectContent>
                {pecas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} — saldo: {p.quantidade} {p.unidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_MOVIMENTACAO_LABEL).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tipo === "AJUSTE" ? "Novo saldo" : "Quantidade"}</Label>
              <Input
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                inputMode="decimal"
                placeholder={
                  tipo === "AJUSTE" && pecaSelecionada
                    ? `Atual: ${pecaSelecionada.quantidade}`
                    : "0"
                }
              />
            </div>
          </div>
          {tipo === "ENTRADA" && (
            <div className="space-y-1.5">
              <Label>Custo unitário (opcional)</Label>
              <Input
                value={custoUnitario}
                onChange={(e) => setCustoUnitario(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: compra avulsa, perda, inventário..."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando || !pecaId}>
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Registrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
