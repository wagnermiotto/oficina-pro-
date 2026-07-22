"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatarCpfCnpj } from "@/shared/utils/documento";
import type { FornecedorFormValues } from "../schemas/compras-schemas";
import {
  atualizarFornecedorAction,
  criarFornecedorAction,
  excluirFornecedorAction,
} from "../actions/compras-actions";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export interface FornecedorLinha {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  pedidos: number;
  pecas: number;
}

const VAZIO: FornecedorFormValues = {
  nome: "",
  cnpj: "",
  telefone: "",
  email: "",
  observacoes: "",
};

function FornecedorDialog({
  fornecedorId,
  valoresIniciais,
  trigger,
}: {
  fornecedorId?: string;
  valoresIniciais?: FornecedorFormValues;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const edicao = Boolean(fornecedorId);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [valores, setValores] = useState<FornecedorFormValues>(
    valoresIniciais ?? VAZIO
  );

  async function salvar() {
    setSalvando(true);
    const resultado = edicao
      ? await atualizarFornecedorAction(fornecedorId!, valores)
      : await criarFornecedorAction(valores);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(edicao ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
    setAberto(false);
    if (!edicao) setValores(VAZIO);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Plus className="size-4" /> Novo fornecedor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input
              value={valores.nome}
              onChange={(e) => setValores((v) => ({ ...v, nome: e.target.value }))}
              placeholder="Auto Peças Central"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input
                value={valores.cnpj ?? ""}
                onChange={(e) =>
                  setValores((v) => ({ ...v, cnpj: formatarCpfCnpj(e.target.value) }))
                }
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={valores.telefone ?? ""}
                onChange={(e) =>
                  setValores((v) => ({ ...v, telefone: e.target.value }))
                }
                placeholder="(11) 4444-1234"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={valores.email ?? ""}
              onChange={(e) => setValores((v) => ({ ...v, email: e.target.value }))}
              placeholder="vendas@fornecedor.com.br"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input
              value={valores.observacoes ?? ""}
              onChange={(e) =>
                setValores((v) => ({ ...v, observacoes: e.target.value }))
              }
              placeholder="Condições, prazos..."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="size-4 animate-spin" />}
              {edicao ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AcoesFornecedor({ fornecedor }: { fornecedor: FornecedorLinha }) {
  const router = useRouter();

  async function excluir() {
    const resultado = await excluirFornecedorAction(fornecedor.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Fornecedor excluído.");
    router.refresh();
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Ações">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <FornecedorDialog
            fornecedorId={fornecedor.id}
            valoresIniciais={{
              nome: fornecedor.nome,
              cnpj: fornecedor.cnpj ?? "",
              telefone: fornecedor.telefone ?? "",
              email: fornecedor.email ?? "",
              observacoes: "",
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {fornecedor.nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            O fornecedor sai das listagens; pedidos e peças vinculados são
            preservados.
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

export function FornecedoresSection({ dados }: { dados: FornecedorLinha[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FornecedorDialog />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Fornecedor</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Vínculos</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum fornecedor cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              dados.map((fornecedor) => (
                <TableRow key={fornecedor.id}>
                  <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {fornecedor.cnpj ? formatarCpfCnpj(fornecedor.cnpj) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{fornecedor.telefone ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {fornecedor.email ?? ""}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {fornecedor.pedidos} pedido{fornecedor.pedidos === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline">
                        {fornecedor.pecas} peça{fornecedor.pecas === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AcoesFornecedor fornecedor={fornecedor} />
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
