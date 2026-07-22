"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  VeiculoFormValues,
  VeiculoInput,
} from "../schemas/veiculo-schemas";
import {
  atualizarVeiculoAction,
  criarVeiculoAction,
} from "../actions/veiculos-actions";
import { VeiculoForm, type ClienteOpcao } from "./veiculo-form";

interface VeiculoDialogProps {
  clientes: ClienteOpcao[];
  veiculoId?: string;
  valoresIniciais?: Partial<VeiculoFormValues>;
  clienteFixo?: boolean;
  trigger?: React.ReactNode;
}

export function VeiculoDialog({
  clientes,
  veiculoId,
  valoresIniciais,
  clienteFixo,
  trigger,
}: VeiculoDialogProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const edicao = Boolean(veiculoId);

  async function onSubmit(valores: VeiculoInput) {
    setSalvando(true);
    const resultado = edicao
      ? await atualizarVeiculoAction(veiculoId!, valores)
      : await criarVeiculoAction(valores);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(edicao ? "Veículo atualizado." : "Veículo cadastrado.");
    setAberto(false);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-destaque text-destaque-foreground hover:bg-destaque/90">
            <Plus className="size-4" />
            Novo veículo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar veículo" : "Novo veículo"}</DialogTitle>
          <DialogDescription>
            {edicao
              ? "Atualize os dados do veículo."
              : "Cadastre um carro ou moto vinculado a um cliente."}
          </DialogDescription>
        </DialogHeader>
        <VeiculoForm
          clientes={clientes}
          valoresIniciais={valoresIniciais}
          onSubmit={onSubmit}
          salvando={salvando}
          rotuloBotao={edicao ? "Salvar alterações" : "Cadastrar veículo"}
          clienteFixo={clienteFixo}
        />
      </DialogContent>
    </Dialog>
  );
}
