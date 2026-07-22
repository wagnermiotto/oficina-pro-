"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { criarAgendamentoAction } from "../actions/agenda-actions";
import { TIPO_AGENDAMENTO_LABEL } from "../schemas/agenda-schemas";
import { formatarPlaca } from "@/shared/utils/placa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

export interface ClienteAgendaOpcao {
  id: string;
  nome: string;
  veiculos: { id: string; placa: string; modelo: string | null }[];
}

export function AgendamentoDialog({ clientes }: { clientes: ClienteAgendaOpcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("REVISAO");
  const [clienteId, setClienteId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const veiculos = useMemo(
    () => clientes.find((c) => c.id === clienteId)?.veiculos ?? [],
    [clientes, clienteId]
  );

  async function salvar() {
    setSalvando(true);
    const resultado = await criarAgendamentoAction({
      titulo,
      tipo: tipo as "REVISAO",
      clienteId,
      veiculoId,
      data,
      horaInicio,
      horaFim,
      observacoes,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Agendamento criado.");
    setAberto(false);
    setTitulo("");
    setData("");
    setObservacoes("");
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="bg-destaque text-destaque-foreground hover:bg-destaque/90">
          <Plus className="size-4" /> Novo agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_10rem] gap-3">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Revisão dos 70 mil — Gol"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_AGENDAMENTO_LABEL).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select
                value={clienteId}
                onValueChange={(v) => {
                  setClienteId(v);
                  setVeiculoId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Veículo</Label>
              <Select
                value={veiculoId}
                onValueChange={setVeiculoId}
                disabled={!clienteId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.modelo ?? "Veículo"} · {formatarPlaca(v.placa)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Início *</Label>
              <Input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes do compromisso..."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Agendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
