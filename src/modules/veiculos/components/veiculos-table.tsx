"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Bike,
  Car,
  ClipboardList,
  Eye,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/shared/components/data-table";
import { formatarPlaca } from "@/shared/utils/placa";
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
import { excluirVeiculoAction } from "../actions/veiculos-actions";

export interface VeiculoLinha {
  id: string;
  tipo: "CARRO" | "MOTO";
  placa: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
  quilometragem: number | null;
  clienteId: string;
  clienteNome: string;
  ordens: number;
  checkIns: number;
}

function AcoesVeiculo({ veiculo }: { veiculo: VeiculoLinha }) {
  const router = useRouter();

  async function excluir() {
    const resultado = await excluirVeiculoAction(veiculo.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Veículo excluído.");
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
            <Link href={`/veiculos/${veiculo.id}`}>
              <Eye className="size-4" /> Ver detalhes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/veiculos/${veiculo.id}/checkin`}>
              <ClipboardList className="size-4" /> Fazer check-in
            </Link>
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
              <Trash2 className="size-4" /> Excluir
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {formatarPlaca(veiculo.placa)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O veículo sai das listagens, mas o histórico é preservado.
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

const colunas: ColumnDef<VeiculoLinha, unknown>[] = [
  {
    accessorKey: "placa",
    header: "Placa",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-primary/20">
          {row.original.tipo === "MOTO" ? (
            <Bike className="size-4" />
          ) : (
            <Car className="size-4" />
          )}
        </div>
        <span className="font-mono font-semibold">
          {formatarPlaca(row.original.placa)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "modelo",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Veículo <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {[row.original.marca, row.original.modelo].filter(Boolean).join(" ") || "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          {[row.original.ano, row.original.cor].filter(Boolean).join(" · ")}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "clienteNome",
    header: "Proprietário",
    cell: ({ row }) => (
      <Link
        href={`/clientes/${row.original.clienteId}`}
        className="hover:text-destaque hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.clienteNome}
      </Link>
    ),
  },
  {
    accessorKey: "quilometragem",
    header: "Km",
    cell: ({ row }) =>
      row.original.quilometragem != null
        ? row.original.quilometragem.toLocaleString("pt-BR")
        : "—",
  },
  {
    id: "historico",
    header: "Histórico",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Badge variant="secondary">{row.original.ordens} OS</Badge>
        <Badge variant="outline">{row.original.checkIns} check-ins</Badge>
      </div>
    ),
  },
  {
    id: "acoes",
    header: "",
    cell: ({ row }) => (
      <div className="text-right">
        <AcoesVeiculo veiculo={row.original} />
      </div>
    ),
  },
];

export function VeiculosTable({ dados }: { dados: VeiculoLinha[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={colunas}
      data={dados}
      mensagemVazia="Nenhum veículo encontrado."
      onRowClick={(linha) => router.push(`/veiculos/${linha.id}`)}
    />
  );
}
