"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import { ajustarOSAction } from "../actions/os-actions";
import type { MecanicoOpcao } from "./os-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface OSAjustesCardProps {
  osId: string;
  editavel: boolean;
  mecanicos: MecanicoOpcao[];
  mecanicoId: string | null;
  descontoValor: number;
  impostoPercent: number;
  observacoesInternas: string | null;
  totalServicos: number;
  totalPecas: number;
  total: number;
}

export function OSAjustesCard(props: OSAjustesCardProps) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [mecanicoId, setMecanicoId] = useState(props.mecanicoId ?? "");
  const [desconto, setDesconto] = useState(
    props.descontoValor > 0 ? String(props.descontoValor) : ""
  );
  const [imposto, setImposto] = useState(
    props.impostoPercent > 0 ? String(props.impostoPercent) : ""
  );
  const [observacoes, setObservacoes] = useState(props.observacoesInternas ?? "");

  const subtotal = props.totalServicos + props.totalPecas;

  async function salvar() {
    setSalvando(true);
    const resultado = await ajustarOSAction(props.osId, {
      mecanicoId,
      descontoValor: desconto,
      impostoPercent: imposto,
      observacoesInternas: observacoes,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Ajustes salvos e totais recalculados.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo financeiro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Serviços</dt>
            <dd className="font-mono">{formatarMoeda(props.totalServicos)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Peças</dt>
            <dd className="font-mono">{formatarMoeda(props.totalPecas)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono">{formatarMoeda(subtotal)}</dd>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd className="font-mono text-destaque">{formatarMoeda(props.total)}</dd>
          </div>
        </dl>

        {props.editavel && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Mecânico responsável</Label>
                <Select value={mecanicoId} onValueChange={setMecanicoId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Não atribuído" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.mecanicos.map((mecanico) => (
                      <SelectItem key={mecanico.userId} value={mecanico.userId}>
                        {mecanico.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Desconto (R$)</Label>
                  <Input
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Impostos (%)</Label>
                  <Input
                    value={imposto}
                    onChange={(e) => setImposto(e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observações internas</Label>
                <Textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Visível apenas para a equipe."
                />
              </div>
              <Button onClick={salvar} disabled={salvando} className="w-full">
                {salvando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Salvar ajustes
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
