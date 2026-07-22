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
  ClienteFormValues,
  ClienteInput,
} from "../schemas/cliente-schemas";
import {
  atualizarClienteAction,
  criarClienteAction,
} from "../actions/clientes-actions";
import { ClienteForm } from "./cliente-form";

interface ClienteDialogProps {
  clienteId?: string;
  valoresIniciais?: Partial<ClienteFormValues>;
  trigger?: React.ReactNode;
}

export function ClienteDialog({
  clienteId,
  valoresIniciais,
  trigger,
}: ClienteDialogProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const edicao = Boolean(clienteId);

  async function onSubmit(valores: ClienteInput) {
    setSalvando(true);
    const resultado = edicao
      ? await atualizarClienteAction(clienteId!, valores)
      : await criarClienteAction(valores);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(edicao ? "Cliente atualizado." : "Cliente cadastrado.");
    setAberto(false);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-destaque text-destaque-foreground hover:bg-destaque/90">
            <Plus className="size-4" />
            Novo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {edicao
              ? "Atualize os dados do cliente."
              : "Cadastre um cliente pessoa física ou jurídica."}
          </DialogDescription>
        </DialogHeader>
        <ClienteForm
          valoresIniciais={valoresIniciais}
          onSubmit={onSubmit}
          salvando={salvando}
          rotuloBotao={edicao ? "Salvar alterações" : "Cadastrar cliente"}
        />
      </DialogContent>
    </Dialog>
  );
}
