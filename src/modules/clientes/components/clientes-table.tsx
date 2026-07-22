"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Car, Eye, MoreHorizontal, Pencil, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/shared/components/data-table";
import { formatarCpfCnpj } from "@/shared/utils/documento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { excluirClienteAction } from "../actions/clientes-actions";
import { ClienteDialog } from "./cliente-dialog";

export interface ClienteLinha {
  id: string;
  tipo: "FISICA" | "JURIDICA";
  nome: string;
  cpfCnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  veiculos: number;
  ordens: number;
}

function AcoesCliente({ cliente }: { cliente: ClienteLinha }) {
  const router = useRouter();

  async function excluir() {
    const resultado = await excluirClienteAction(cliente.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Cliente excluído.");
    router.refresh();
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => e.stopPropagation()}
            aria-label="Ações"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem asChild>
            <Link href={`/clientes/${cliente.id}`}>
              <Eye className="size-4" /> Ver detalhes
            </Link>
          </DropdownMenuItem>
          <ClienteDialog
            clienteId={cliente.id}
            valoresIniciais={{
              tipo: cliente.tipo,
              nome: cliente.nome,
              cpfCnpj: cliente.cpfCnpj ?? "",
              telefone: cliente.telefone ?? "",
              whatsapp: cliente.whatsapp ?? "",
              email: cliente.email ?? "",
              cidade: cliente.cidade ?? "",
              estado: cliente.estado ?? "",
            }}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
            }
          />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Trash2 className="size-4" /> Excluir
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {cliente.nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            O cliente sai das listagens, mas o histórico é preservado
            (exclusão reversível). Clientes com OS em andamento não podem ser
            excluídos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={excluir}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const colunas: ColumnDef<ClienteLinha, unknown>[] = [
  {
    accessorKey: "nome",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nome <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.nome}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.cpfCnpj ? formatarCpfCnpj(row.original.cpfCnpj) : "—"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.tipo === "JURIDICA" ? "PJ" : "PF"}
      </Badge>
    ),
  },
  {
    accessorKey: "telefone",
    header: "Contato",
    cell: ({ row }) => (
      <div className="text-sm">
        <p>{row.original.whatsapp ?? row.original.telefone ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{row.original.email ?? ""}</p>
      </div>
    ),
  },
  {
    accessorKey: "cidade",
    header: "Cidade",
    cell: ({ row }) =>
      row.original.cidade
        ? `${row.original.cidade}${row.original.estado ? `/${row.original.estado}` : ""}`
        : "—",
  },
  {
    id: "vinculos",
    header: "Vínculos",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Car className="size-3.5" /> {row.original.veiculos}
        </span>
        <span className="flex items-center gap-1">
          <Wrench className="size-3.5" /> {row.original.ordens}
        </span>
      </div>
    ),
  },
  {
    id: "acoes",
    header: "",
    cell: ({ row }) => (
      <div className="text-right">
        <AcoesCliente cliente={row.original} />
      </div>
    ),
  },
];

export function ClientesTable({ dados }: { dados: ClienteLinha[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={colunas}
      data={dados}
      mensagemVazia="Nenhum cliente encontrado. Cadastre o primeiro!"
      onRowClick={(linha) => router.push(`/clientes/${linha.id}`)}
    />
  );
}
