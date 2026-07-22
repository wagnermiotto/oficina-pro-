"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusPedidoCompra } from "@prisma/client";
import { ArrowRight, ChevronDown, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import {
  STATUS_PEDIDO_BADGE,
  STATUS_PEDIDO_LABEL,
  TRANSICOES_PEDIDO,
} from "../schemas/compras-schemas";
import { mudarStatusPedidoAction } from "../actions/compras-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface PedidoLinha {
  id: string;
  numero: number;
  fornecedor: string | null;
  status: StatusPedidoCompra;
  total: number;
  criadoEm: string;
  itens: number;
  notaFiscal: string | null;
}

function AcoesPedido({ pedido }: { pedido: PedidoLinha }) {
  const router = useRouter();
  const [processando, setProcessando] = useState(false);
  const [dialogRecebimento, setDialogRecebimento] = useState(false);
  const [notaFiscal, setNotaFiscal] = useState("");
  const transicoes = TRANSICOES_PEDIDO[pedido.status];

  async function mudar(novo: StatusPedidoCompra, nf?: string) {
    setProcessando(true);
    const resultado = await mudarStatusPedidoAction(pedido.id, novo, nf);
    setProcessando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(
      novo === "RECEBIDO"
        ? "Pedido recebido — estoque atualizado e despesa lançada."
        : `Pedido movido para ${STATUS_PEDIDO_LABEL[novo]}.`
    );
    setDialogRecebimento(false);
    router.refresh();
  }

  if (transicoes.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={processando}>
            Avançar <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {transicoes.map((novo) => (
            <DropdownMenuItem
              key={novo}
              variant={novo === "CANCELADO" ? "destructive" : "default"}
              onClick={() =>
                novo === "RECEBIDO" ? setDialogRecebimento(true) : mudar(novo)
              }
            >
              {novo === "RECEBIDO" ? (
                <PackageCheck className="size-4" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {STATUS_PEDIDO_LABEL[novo]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogRecebimento} onOpenChange={setDialogRecebimento}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Receber pedido #{String(pedido.numero).padStart(4, "0")}</DialogTitle>
            <DialogDescription>
              As peças vinculadas entram no estoque e a despesa vai para o
              contas a pagar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nota fiscal (opcional)</Label>
              <Input
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                placeholder="Número da NF-e"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogRecebimento(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => mudar("RECEBIDO", notaFiscal || undefined)}
                disabled={processando}
              >
                <PackageCheck className="size-4" /> Confirmar recebimento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PedidosTable({ dados }: { dados: PedidoLinha[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Nº</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Itens</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dados.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                Nenhum pedido de compra.
              </TableCell>
            </TableRow>
          ) : (
            dados.map((pedido) => (
              <TableRow key={pedido.id}>
                <TableCell className="font-mono font-semibold">
                  #{String(pedido.numero).padStart(4, "0")}
                </TableCell>
                <TableCell>{pedido.fornecedor ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("font-normal", STATUS_PEDIDO_BADGE[pedido.status])}
                  >
                    {STATUS_PEDIDO_LABEL[pedido.status]}
                  </Badge>
                  {pedido.notaFiscal ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      NF {pedido.notaFiscal}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">{pedido.itens}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatarMoeda(pedido.total)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {pedido.criadoEm}
                </TableCell>
                <TableCell className="text-right">
                  <AcoesPedido pedido={pedido} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
