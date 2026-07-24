"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import { criarPedidoAction } from "../actions/compras-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export interface FornecedorOpcao {
  id: string;
  nome: string;
}

export interface PecaCompraOpcao {
  id: string;
  nome: string;
  precoCusto: number;
}

interface ItemPedidoForm {
  pecaId: string;
  descricao: string;
  quantidade: string;
  custoUnitario: string;
}

export interface PedidoInicial {
  fornecedorId?: string;
  itens: ItemPedidoForm[];
}

interface PedidoDialogProps {
  fornecedores: FornecedorOpcao[];
  pecas: PecaCompraOpcao[];
  /** Pré-preenche o formulário (ex.: sugestão de reposição). */
  inicial?: PedidoInicial;
  /** Trigger customizado; quando ausente, usa o botão "Novo pedido". */
  trigger?: React.ReactNode;
}

const ITEM_VAZIO: ItemPedidoForm = {
  pecaId: "",
  descricao: "",
  quantidade: "1",
  custoUnitario: "",
};

export function PedidoDialog({ fornecedores, pecas, inicial, trigger }: PedidoDialogProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [fornecedorId, setFornecedorId] = useState(inicial?.fornecedorId ?? "");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemPedidoForm[]>(
    inicial?.itens.length ? inicial.itens : [{ ...ITEM_VAZIO }]
  );

  function atualizarItem(indice: number, mudancas: Partial<ItemPedidoForm>) {
    setItens((atuais) =>
      atuais.map((item, i) => (i === indice ? { ...item, ...mudancas } : item))
    );
  }

  function escolherPeca(indice: number, pecaId: string) {
    const peca = pecas.find((p) => p.id === pecaId);
    atualizarItem(indice, {
      pecaId,
      descricao: peca?.nome ?? "",
      custoUnitario: peca ? String(peca.precoCusto) : "",
    });
  }

  const totalEstimado = itens.reduce((soma, item) => {
    const qtd = Number(String(item.quantidade).replace(",", ".")) || 0;
    const custo = Number(String(item.custoUnitario).replace(",", ".")) || 0;
    return soma + qtd * custo;
  }, 0);

  async function salvar() {
    setSalvando(true);
    const resultado = await criarPedidoAction({
      fornecedorId,
      observacoes,
      itens: itens.map((item) => ({
        pecaId: item.pecaId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        custoUnitario: item.custoUnitario,
      })),
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Pedido de compra criado.");
    setAberto(false);
    setFornecedorId(inicial?.fornecedorId ?? "");
    setObservacoes("");
    setItens(inicial?.itens.length ? inicial.itens : [{ ...ITEM_VAZIO }]);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-destaque text-destaque-foreground hover:bg-destaque/90">
            <Plus className="size-4" /> Novo pedido
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo pedido de compra</DialogTitle>
          <DialogDescription>
            O pedido nasce como solicitação; ao marcar como recebido, o
            estoque entra automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fornecedor</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar fornecedor (opcional)" />
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do pedido</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItens((a) => [...a, { ...ITEM_VAZIO }])}
              >
                <Plus className="size-4" /> Item
              </Button>
            </div>
            {itens.map((item, indice) => (
              <div
                key={indice}
                className="grid grid-cols-[1fr_5rem_7rem_auto] items-end gap-2 rounded-lg border p-2"
              >
                <div className="space-y-1">
                  <Select
                    value={item.pecaId}
                    onValueChange={(v) => escolherPeca(indice, v)}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Peça do estoque (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {pecas.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={item.descricao}
                    onChange={(e) =>
                      atualizarItem(indice, { descricao: e.target.value })
                    }
                    placeholder="Descrição do item"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Qtd.</Label>
                  <Input
                    value={item.quantidade}
                    onChange={(e) =>
                      atualizarItem(indice, { quantidade: e.target.value })
                    }
                    inputMode="decimal"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">
                    Custo unit.
                  </Label>
                  <Input
                    value={item.custoUnitario}
                    onChange={(e) =>
                      atualizarItem(indice, { custoUnitario: e.target.value })
                    }
                    inputMode="decimal"
                    placeholder="0,00"
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-0.5"
                  disabled={itens.length === 1}
                  onClick={() => setItens((a) => a.filter((_, i) => i !== indice))}
                  aria-label="Remover item"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Prazo combinado, condições de pagamento..."
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total estimado:{" "}
              <span className="font-mono font-semibold text-foreground">
                {formatarMoeda(totalEstimado)}
              </span>
            </p>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Criar pedido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
