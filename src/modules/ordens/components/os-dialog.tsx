"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatarPlaca } from "@/shared/utils/placa";
import {
  novaOSSchema,
  type NovaOSFormValues,
  type NovaOSInput,
} from "../schemas/os-schemas";
import { criarOSAction } from "../actions/os-actions";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ClienteComVeiculos {
  id: string;
  nome: string;
  veiculos: { id: string; placa: string; marca: string | null; modelo: string | null }[];
}

export interface MecanicoOpcao {
  userId: string;
  nome: string;
}

interface OSDialogProps {
  clientes: ClienteComVeiculos[];
  mecanicos: MecanicoOpcao[];
}

export function OSDialog({ clientes, mecanicos }: OSDialogProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const form = useForm<NovaOSFormValues, unknown, NovaOSInput>({
    resolver: zodResolver(novaOSSchema),
    defaultValues: {
      clienteId: "",
      veiculoId: "",
      mecanicoId: "",
      descricaoProblema: "",
      dataPrevista: "",
      garantiaDias: "",
    },
  });

  const clienteId = form.watch("clienteId");
  const veiculosDoCliente = useMemo(
    () => clientes.find((c) => c.id === clienteId)?.veiculos ?? [],
    [clientes, clienteId]
  );

  async function onSubmit(valores: NovaOSInput) {
    setSalvando(true);
    const resultado = await criarOSAction(valores);
    setSalvando(false);
    if (!resultado.ok || !resultado.id) {
      toast.error(resultado.erro ?? "Não foi possível criar a OS.");
      return;
    }
    toast.success("Ordem de serviço criada.");
    setAberto(false);
    router.push(`/ordens/${resultado.id}`);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="bg-destaque text-destaque-foreground hover:bg-destaque/90">
          <Plus className="size-4" />
          Nova OS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova ordem de serviço</DialogTitle>
          <DialogDescription>
            O veículo dá entrada com status “Recebido”.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="clienteId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cliente</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? clientes.find((c) => c.id === field.value)?.nome
                            : "Selecionar cliente..."}
                          <ChevronsUpDown className="size-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {clientes.map((cliente) => (
                              <CommandItem
                                key={cliente.id}
                                value={cliente.nome}
                                onSelect={() => {
                                  field.onChange(cliente.id);
                                  form.setValue("veiculoId", "");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "size-4",
                                    cliente.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {cliente.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="veiculoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículo</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!clienteId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            clienteId
                              ? veiculosDoCliente.length > 0
                                ? "Selecionar veículo..."
                                : "Cliente sem veículos cadastrados"
                              : "Selecione o cliente primeiro"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {veiculosDoCliente.map((veiculo) => (
                        <SelectItem key={veiculo.id} value={veiculo.id}>
                          {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}{" "}
                          · {formatarPlaca(veiculo.placa)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="mecanicoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mecânico responsável</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Atribuir depois" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mecanicos.map((mecanico) => (
                          <SelectItem key={mecanico.userId} value={mecanico.userId}>
                            {mecanico.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataPrevista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previsão de entrega</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={typeof field.value === "string" ? field.value : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricaoProblema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema relatado pelo cliente</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Ex.: barulho na suspensão dianteira ao passar em buracos..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={salvando}>
                {salvando && <Loader2 className="size-4 animate-spin" />}
                Criar OS
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
