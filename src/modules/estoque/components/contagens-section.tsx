"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  carregarContagemAction,
  cancelarContagemAction,
  concluirContagemAction,
  criarContagemAction,
  salvarContagensAction,
  type ContagemItemDetalhe,
} from "../actions/estoque-actions";
import {
  STATUS_CONTAGEM_BADGE,
  STATUS_CONTAGEM_LABEL,
} from "../schemas/estoque-schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ContagemResumo {
  id: string;
  numero: number;
  status: string;
  categoria: string | null;
  qtdItens: number;
  createdAt: Date;
  concluidaEm: Date | null;
}

interface Props {
  contagens: ContagemResumo[];
  categorias: { id: string; nome: string }[];
}

export function ContagensSection({ contagens, categorias }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Confira o saldo físico contra o sistema. Divergências viram ajustes de
          estoque com trilha de auditoria.
        </p>
        <NovaContagemDialog categorias={categorias} />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-20">Nº</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contagens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhuma contagem registrada.
                </TableCell>
              </TableRow>
            ) : (
              contagens.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">
                    #{String(c.numero).padStart(3, "0")}
                  </TableCell>
                  <TableCell>{c.categoria ?? "Estoque geral"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("font-normal", STATUS_CONTAGEM_BADGE[c.status])}>
                      {STATUS_CONTAGEM_LABEL[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{c.qtdItens}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(c.concluidaEm ?? c.createdAt, "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === "ABERTA" ? (
                      <PreencherContagemDialog contagemId={c.id} numero={c.numero} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NovaContagemDialog({ categorias }: { categorias: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [categoriaId, setCategoriaId] = useState("all");

  async function criar() {
    setSalvando(true);
    const resultado = await criarContagemAction({
      categoriaId: categoriaId === "all" ? undefined : categoriaId,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Contagem aberta. Preencha os saldos contados.");
    setAberto(false);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Nova contagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova contagem cíclica</DialogTitle>
          <DialogDescription>
            Congela o saldo atual das peças para conferência física.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Escopo</Label>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estoque geral (todas as peças)</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={criar} disabled={salvando}>
            {salvando && <Loader2 className="size-4 animate-spin" />}
            Abrir contagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreencherContagemDialog({
  contagemId,
  numero,
}: {
  contagemId: string;
  numero: number;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [itens, setItens] = useState<ContagemItemDetalhe[]>([]);

  async function abrir(open: boolean) {
    setAberto(open);
    if (open && itens.length === 0) {
      setCarregando(true);
      const resultado = await carregarContagemAction(contagemId);
      setCarregando(false);
      if (!resultado.ok || !resultado.itens) {
        toast.error(resultado.erro ?? "Falha ao carregar.");
        setAberto(false);
        return;
      }
      setItens(resultado.itens);
    }
  }

  function alterar(itemId: string, valor: string) {
    setItens((prev) =>
      prev.map((i) =>
        i.itemId === itemId
          ? { ...i, saldoContado: valor === "" ? null : Number(valor.replace(",", ".")) }
          : i
      )
    );
  }

  const preenchidos = itens.filter((i) => i.saldoContado !== null);
  const divergentes = preenchidos.filter((i) => i.saldoContado !== i.saldoSistema);

  async function salvarParcial() {
    setSalvando(true);
    const resultado = await salvarContagensAction(contagemId, {
      itens: itens.map((i) => ({ itemId: i.itemId, saldoContado: i.saldoContado })),
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Contagem salva.");
  }

  async function concluir() {
    setSalvando(true);
    // Persiste os valores digitados antes de fechar a contagem.
    const salvo = await salvarContagensAction(contagemId, {
      itens: itens.map((i) => ({ itemId: i.itemId, saldoContado: i.saldoContado })),
    });
    if (!salvo.ok) {
      setSalvando(false);
      toast.error(salvo.erro);
      return;
    }
    const resultado = await concluirContagemAction(contagemId);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(
      resultado.ajustes === 0
        ? "Contagem concluída sem divergências."
        : `Contagem concluída. ${resultado.ajustes} ajuste(s) aplicado(s).`
    );
    setAberto(false);
    router.refresh();
  }

  async function cancelar() {
    setSalvando(true);
    const resultado = await cancelarContagemAction(contagemId);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Contagem cancelada.");
    setAberto(false);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardList className="size-4" /> Preencher
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contagem #{String(numero).padStart(3, "0")}</DialogTitle>
          <DialogDescription>
            Informe o saldo físico. Em branco = não contado (ignorado na conclusão).
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="max-h-[45vh] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Peça</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="w-32 text-right">Contado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => {
                    const divergente =
                      item.saldoContado !== null && item.saldoContado !== item.saldoSistema;
                    return (
                      <TableRow key={item.itemId}>
                        <TableCell className="font-medium">
                          {item.pecaNome}
                          {item.pecaCodigo ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {item.pecaCodigo}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {item.saldoSistema} {item.unidade}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.saldoContado ?? ""}
                            onChange={(e) => alterar(item.itemId, e.target.value)}
                            inputMode="decimal"
                            placeholder="—"
                            className={cn(
                              "h-8 text-right",
                              divergente && "border-amber-500 text-amber-600 dark:text-amber-400"
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              {preenchidos.length} de {itens.length} contados ·{" "}
              <span className={divergentes.length > 0 ? "text-amber-600 dark:text-amber-400" : ""}>
                {divergentes.length} divergência(s)
              </span>
            </p>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={cancelar} disabled={salvando}>
                Cancelar contagem
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={salvarParcial} disabled={salvando}>
                  {salvando && <Loader2 className="size-4 animate-spin" />}
                  Salvar
                </Button>
                <Button onClick={concluir} disabled={salvando || preenchidos.length === 0}>
                  Concluir ({divergentes.length} ajuste
                  {divergentes.length === 1 ? "" : "s"})
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
