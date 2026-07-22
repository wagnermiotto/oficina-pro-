"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StatusLancamento, TipoLancamento } from "@prisma/client";
import { ArrowDownCircle, ArrowUpCircle, CircleDollarSign, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_LANCAMENTO_BADGE,
  STATUS_LANCAMENTO_LABEL,
} from "../schemas/financeiro-schemas";
import {
  cancelarLancamentoAction,
  marcarPagoAction,
} from "../actions/financeiro-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface LancamentoLinha {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  status: StatusLancamento;
  vencimento: string | null;
  pagoEm: string | null;
  formaPagamento: string | null;
  vinculo: string | null;
  osId: string | null;
  vencido: boolean;
}

function DialogPagamento({
  lancamento,
  aberto,
  onFechar,
}: {
  lancamento: LancamentoLinha | null;
  aberto: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [forma, setForma] = useState("PIX");
  const [processando, setProcessando] = useState(false);

  async function confirmar() {
    if (!lancamento) return;
    setProcessando(true);
    const resultado = await marcarPagoAction(lancamento.id, forma as "PIX");
    setProcessando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(
      lancamento.tipo === "RECEITA" ? "Recebimento baixado." : "Pagamento baixado."
    );
    onFechar();
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Baixar {lancamento?.tipo === "RECEITA" ? "recebimento" : "pagamento"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {lancamento?.descricao} —{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatarMoeda(lancamento?.valor ?? 0)}
            </span>
          </p>
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMA_PAGAMENTO_LABEL).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={processando}>
              <CircleDollarSign className="size-4" /> Confirmar baixa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FiltrosLancamentos() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function aplicar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams);
    if (valor === "TODOS") {
      params.delete(chave);
    } else {
      params.set(chave, valor);
    }
    params.delete("pagina");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <Select
        value={searchParams.get("tipo") ?? "TODOS"}
        onValueChange={(v) => aplicar("tipo", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos os tipos</SelectItem>
          <SelectItem value="RECEITA">Receitas</SelectItem>
          <SelectItem value="DESPESA">Despesas</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("status") ?? "TODOS"}
        onValueChange={(v) => aplicar("status", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos os status</SelectItem>
          <SelectItem value="PENDENTE">Pendentes</SelectItem>
          <SelectItem value="PAGO">Pagos</SelectItem>
          <SelectItem value="CANCELADO">Cancelados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function LancamentosTable({ dados }: { dados: LancamentoLinha[] }) {
  const router = useRouter();
  const [pagando, setPagando] = useState<LancamentoLinha | null>(null);

  async function cancelar(id: string) {
    const resultado = await cancelarLancamentoAction(id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Lançamento cancelado.");
    router.refresh();
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Lançamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              dados.map((lancamento) => (
                <TableRow key={lancamento.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {lancamento.tipo === "RECEITA" ? (
                        <ArrowUpCircle className="size-4 shrink-0 text-chart-5" />
                      ) : (
                        <ArrowDownCircle className="size-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{lancamento.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {lancamento.osId ? (
                            <Link
                              href={`/ordens/${lancamento.osId}`}
                              className="text-destaque hover:underline"
                            >
                              {lancamento.vinculo}
                            </Link>
                          ) : (
                            (lancamento.vinculo ?? "")
                          )}
                          {lancamento.formaPagamento
                            ? ` · ${FORMA_PAGAMENTO_LABEL[lancamento.formaPagamento as "PIX"] ?? lancamento.formaPagamento}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-normal",
                        lancamento.vencido && lancamento.status === "PENDENTE"
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : STATUS_LANCAMENTO_BADGE[lancamento.status]
                      )}
                    >
                      {lancamento.vencido && lancamento.status === "PENDENTE"
                        ? "Vencido"
                        : STATUS_LANCAMENTO_LABEL[lancamento.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lancamento.status === "PAGO"
                      ? `Pago em ${lancamento.pagoEm}`
                      : (lancamento.vencimento ?? "—")}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono",
                      lancamento.tipo === "RECEITA" ? "text-chart-5" : "text-destructive"
                    )}
                  >
                    {lancamento.tipo === "RECEITA" ? "+" : "−"}
                    {formatarMoeda(lancamento.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    {lancamento.status === "PENDENTE" && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagando(lancamento)}
                        >
                          <CircleDollarSign className="size-3.5" /> Baixar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelar(lancamento.id)}
                          aria-label="Cancelar lançamento"
                        >
                          <XCircle className="size-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DialogPagamento
        lancamento={pagando}
        aberto={Boolean(pagando)}
        onFechar={() => setPagando(null)}
      />
    </>
  );
}
