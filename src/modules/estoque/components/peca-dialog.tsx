"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { PecaFormValues } from "../schemas/estoque-schemas";
import {
  atualizarPecaAction,
  criarCategoriaAction,
  criarPecaAction,
} from "../actions/estoque-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

export interface OpcaoSimples {
  id: string;
  nome: string;
}

interface PecaDialogProps {
  categorias: OpcaoSimples[];
  fornecedores: OpcaoSimples[];
  pecaId?: string;
  valoresIniciais?: Partial<PecaFormValues>;
  trigger?: React.ReactNode;
}

const VAZIO: PecaFormValues = {
  nome: "",
  codigo: "",
  codigoBarras: "",
  marca: "",
  unidade: "un",
  categoriaId: "",
  fornecedorId: "",
  precoCusto: "",
  precoVenda: "",
  estoqueMinimo: "",
  quantidadeInicial: "",
  localizacao: "",
};

export function PecaDialog({
  categorias,
  fornecedores,
  pecaId,
  valoresIniciais,
  trigger,
}: PecaDialogProps) {
  const router = useRouter();
  const edicao = Boolean(pecaId);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [valores, setValores] = useState<PecaFormValues>({
    ...VAZIO,
    ...valoresIniciais,
  });
  const [novaCategoria, setNovaCategoria] = useState("");

  function campo<K extends keyof PecaFormValues>(chave: K, valor: PecaFormValues[K]) {
    setValores((v) => ({ ...v, [chave]: valor }));
  }

  async function adicionarCategoria() {
    if (novaCategoria.trim().length < 2) return;
    const resultado = await criarCategoriaAction(novaCategoria.trim());
    if (resultado.ok && resultado.id) {
      toast.success("Categoria criada.");
      campo("categoriaId", resultado.id);
      setNovaCategoria("");
      router.refresh();
    } else {
      toast.error(resultado.erro);
    }
  }

  async function salvar() {
    setSalvando(true);
    const resultado = edicao
      ? await atualizarPecaAction(pecaId!, valores)
      : await criarPecaAction(valores);
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(edicao ? "Peça atualizada." : "Peça cadastrada.");
    setAberto(false);
    if (!edicao) setValores(VAZIO);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-destaque text-destaque-foreground hover:bg-destaque/90">
            <Plus className="size-4" /> Nova peça
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar peça" : "Nova peça"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={valores.nome}
                onChange={(e) => campo("nome", e.target.value)}
                placeholder="Ex.: Filtro de óleo universal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select
                value={valores.unidade}
                onValueChange={(v) => campo("unidade", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["un", "L", "ml", "kg", "g", "m", "cx", "par", "jogo"].map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Código interno</Label>
              <Input
                value={valores.codigo ?? ""}
                onChange={(e) => campo("codigo", e.target.value)}
                placeholder="FO-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código de barras</Label>
              <Input
                value={valores.codigoBarras ?? ""}
                onChange={(e) => campo("codigoBarras", e.target.value)}
                placeholder="789..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input
                value={valores.marca ?? ""}
                onChange={(e) => campo("marca", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={valores.categoriaId ?? ""}
                onValueChange={(v) => campo("categoriaId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 pt-1">
                <Input
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Nova categoria..."
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={adicionarCategoria}
                >
                  Criar
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Select
                value={valores.fornecedorId ?? ""}
                onValueChange={(v) => campo("fornecedorId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sem fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Preço de custo</Label>
              <Input
                value={String(valores.precoCusto ?? "")}
                onChange={(e) => campo("precoCusto", e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preço de venda</Label>
              <Input
                value={String(valores.precoVenda ?? "")}
                onChange={(e) => campo("precoVenda", e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            {!edicao && (
              <div className="space-y-1.5">
                <Label>Saldo inicial</Label>
                <Input
                  value={String(valores.quantidadeInicial ?? "")}
                  onChange={(e) => campo("quantidadeInicial", e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Estoque mínimo</Label>
              <Input
                value={String(valores.estoqueMinimo ?? "")}
                onChange={(e) => campo("estoqueMinimo", e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Localização física</Label>
            <Input
              value={valores.localizacao ?? ""}
              onChange={(e) => campo("localizacao", e.target.value)}
              placeholder="Ex.: Prateleira B3"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="size-4 animate-spin" />}
              {edicao ? "Salvar alterações" : "Cadastrar peça"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
