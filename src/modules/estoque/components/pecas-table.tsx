"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ArrowLeftRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/shared/components/data-table";
import { formatarMoeda } from "@/shared/utils/moeda";
import { excluirPecaAction } from "../actions/estoque-actions";
import { PecaDialog, type OpcaoSimples } from "./peca-dialog";
import { MovimentacaoDialog, type PecaOpcao } from "./movimentacao-dialog";
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
import { cn } from "@/lib/utils";

export interface PecaLinha {
  id: string;
  nome: string;
  codigo: string | null;
  codigoBarras: string | null;
  marca: string | null;
  unidade: string;
  categoria: string | null;
  categoriaId: string | null;
  fornecedorId: string | null;
  precoCusto: number;
  precoVenda: number;
  quantidade: number;
  estoqueMinimo: number;
  localizacao: string | null;
}

interface PecasTableProps {
  dados: PecaLinha[];
  categorias: OpcaoSimples[];
  fornecedores: OpcaoSimples[];
}

function AcoesPeca({
  peca,
  categorias,
  fornecedores,
}: {
  peca: PecaLinha;
  categorias: OpcaoSimples[];
  fornecedores: OpcaoSimples[];
}) {
  const router = useRouter();

  async function excluir() {
    const resultado = await excluirPecaAction(peca.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Peça excluída.");
    router.refresh();
  }

  const pecaOpcao: PecaOpcao = {
    id: peca.id,
    nome: peca.nome,
    quantidade: peca.quantidade,
    unidade: peca.unidade,
  };

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Ações">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <PecaDialog
            categorias={categorias}
            fornecedores={fornecedores}
            pecaId={peca.id}
            valoresIniciais={{
              nome: peca.nome,
              codigo: peca.codigo ?? "",
              codigoBarras: peca.codigoBarras ?? "",
              marca: peca.marca ?? "",
              unidade: peca.unidade,
              categoriaId: peca.categoriaId ?? "",
              fornecedorId: peca.fornecedorId ?? "",
              precoCusto: String(peca.precoCusto),
              precoVenda: String(peca.precoVenda),
              estoqueMinimo: String(peca.estoqueMinimo),
              localizacao: peca.localizacao ?? "",
            }}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
            }
          />
          <MovimentacaoDialog
            pecas={[pecaOpcao]}
            pecaInicialId={peca.id}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <ArrowLeftRight className="size-4" /> Movimentar
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {peca.nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            A peça sai do catálogo, mas o histórico de movimentações é
            preservado.
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

export function PecasTable({ dados, categorias, fornecedores }: PecasTableProps) {
  const colunas: ColumnDef<PecaLinha, unknown>[] = [
    {
      accessorKey: "nome",
      header: "Peça",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.nome}</p>
          <p className="text-xs text-muted-foreground">
            {[row.original.codigo, row.original.marca].filter(Boolean).join(" · ") ||
              "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "categoria",
      header: "Categoria",
      cell: ({ row }) =>
        row.original.categoria ? (
          <Badge variant="outline">{row.original.categoria}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "quantidade",
      header: () => <span className="block text-right">Saldo</span>,
      cell: ({ row }) => {
        const baixo = row.original.quantidade <= row.original.estoqueMinimo;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {baixo && <AlertTriangle className="size-3.5 text-destructive" />}
            <span
              className={cn(
                "font-mono",
                baixo && "font-semibold text-destructive"
              )}
            >
              {row.original.quantidade} {row.original.unidade}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "precoCusto",
      header: () => <span className="block text-right">Custo</span>,
      cell: ({ row }) => (
        <span className="block text-right font-mono text-muted-foreground">
          {formatarMoeda(row.original.precoCusto)}
        </span>
      ),
    },
    {
      accessorKey: "precoVenda",
      header: () => <span className="block text-right">Venda</span>,
      cell: ({ row }) => (
        <span className="block text-right font-mono">
          {formatarMoeda(row.original.precoVenda)}
        </span>
      ),
    },
    {
      accessorKey: "localizacao",
      header: "Local",
      cell: ({ row }) => row.original.localizacao ?? "—",
    },
    {
      id: "acoes",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <AcoesPeca
            peca={row.original}
            categorias={categorias}
            fornecedores={fornecedores}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={colunas}
      data={dados}
      mensagemVazia="Nenhuma peça encontrada."
    />
  );
}
