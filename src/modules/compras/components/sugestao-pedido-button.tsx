"use client";

import { PackagePlus } from "lucide-react";
import { PedidoDialog, type FornecedorOpcao, type PecaCompraOpcao } from "./pedido-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface SugestaoGrupo {
  fornecedorId: string | null;
  fornecedorNome: string;
  itens: {
    pecaId: string;
    descricao: string;
    quantidade: number;
    custoUnitario: number;
  }[];
}

interface Props {
  sugestoes: SugestaoGrupo[];
  fornecedores: FornecedorOpcao[];
  pecas: PecaCompraOpcao[];
}

/**
 * Botão que sugere pedidos de reposição para peças abaixo do mínimo, agrupados
 * por fornecedor. Cada grupo abre o PedidoDialog já pré-preenchido.
 */
export function SugestaoPedidoButton({ sugestoes, fornecedores, pecas }: Props) {
  if (sugestoes.length === 0) return null;

  // Um único grupo: botão direto abre o dialog pré-preenchido.
  if (sugestoes.length === 1) {
    const grupo = sugestoes[0];
    return (
      <PedidoDialog
        fornecedores={fornecedores}
        pecas={pecas}
        inicial={inicialDoGrupo(grupo)}
        trigger={
          <Button variant="outline">
            <PackagePlus className="size-4" /> Repor abaixo do mínimo (
            {grupo.itens.length})
          </Button>
        }
      />
    );
  }

  // Vários fornecedores: menu para escolher qual pedido gerar.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <PackagePlus className="size-4" /> Repor abaixo do mínimo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Gerar pedido por fornecedor</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sugestoes.map((grupo) => (
          <PedidoDialog
            key={grupo.fornecedorId ?? "sem"}
            fornecedores={fornecedores}
            pecas={pecas}
            inicial={inicialDoGrupo(grupo)}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <span className="flex-1">{grupo.fornecedorNome}</span>
                <span className="text-xs text-muted-foreground">
                  {grupo.itens.length} item{grupo.itens.length === 1 ? "" : "s"}
                </span>
              </DropdownMenuItem>
            }
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function inicialDoGrupo(grupo: SugestaoGrupo) {
  return {
    fornecedorId: grupo.fornecedorId ?? undefined,
    itens: grupo.itens.map((i) => ({
      pecaId: i.pecaId,
      descricao: i.descricao,
      quantidade: String(i.quantidade),
      custoUnitario: String(i.custoUnitario),
    })),
  };
}
