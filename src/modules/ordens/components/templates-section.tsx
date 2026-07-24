"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  criarTemplateAction,
  excluirTemplateAction,
} from "../actions/template-actions";
import { formatarMoeda } from "@/shared/utils/moeda";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface ItemForm {
  tipo: "SERVICO" | "PECA";
  descricao: string;
  valor: string;
  quantidade: string;
}

interface TemplateLinha {
  id: string;
  nome: string;
  tipoVeiculo: string | null;
  itens: { tipo: string; descricao: string }[];
}

const ITEM_VAZIO: ItemForm = { tipo: "SERVICO", descricao: "", valor: "", quantidade: "1" };

export function TemplatesSection({ templates }: { templates: TemplateLinha[] }) {
  const router = useRouter();

  async function excluir(id: string) {
    const r = await excluirTemplateAction(id);
    if (!r.ok) return toast.error(r.erro);
    toast.success("Pacote removido.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pacotes prontos (serviços + peças) que você aplica numa OS em um clique.
        </p>
        <NovoTemplateDialog />
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum pacote criado. Crie “Revisão 10 mil km”, “Troca de óleo”, etc.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-chart-2" />
                  <div>
                    <p className="font-medium">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.itens.length} item(s)
                      {t.tipoVeiculo ? ` · ${t.tipoVeiculo === "MOTO" ? "Moto" : "Carro"}` : ""}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => excluir(t.id)} aria-label="Remover">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {t.itens.slice(0, 5).map((i, idx) => (
                  <li key={idx}>· {i.descricao}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NovoTemplateDialog() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState<"" | "CARRO" | "MOTO">("");
  const [itens, setItens] = useState<ItemForm[]>([{ ...ITEM_VAZIO }]);

  function atualizar(i: number, mud: Partial<ItemForm>) {
    setItens((a) => a.map((it, idx) => (idx === i ? { ...it, ...mud } : it)));
  }

  async function salvar() {
    setSalvando(true);
    const r = await criarTemplateAction({
      nome,
      tipoVeiculo: tipoVeiculo || undefined,
      itens: itens.map((i) => ({
        tipo: i.tipo,
        descricao: i.descricao,
        valor: i.valor,
        quantidade: i.quantidade,
      })),
    });
    setSalvando(false);
    if (!r.ok) return toast.error(r.erro);
    toast.success("Pacote criado.");
    setAberto(false);
    setNome("");
    setItens([{ ...ITEM_VAZIO }]);
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button><Plus className="size-4" /> Novo pacote</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo pacote de serviço</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_9rem] gap-3">
            <div className="space-y-1.5">
              <Label>Nome do pacote</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Revisão 10 mil km" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de veículo</Label>
              <Select value={tipoVeiculo || "todos"} onValueChange={(v) => setTipoVeiculo(v === "todos" ? "" : (v as "CARRO" | "MOTO"))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="CARRO">Carro</SelectItem>
                  <SelectItem value="MOTO">Moto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do pacote</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItens((a) => [...a, { ...ITEM_VAZIO }])}>
                <Plus className="size-4" /> Item
              </Button>
            </div>
            {itens.map((item, i) => (
              <div key={i} className="grid grid-cols-[6.5rem_1fr_5rem_4rem_auto] items-end gap-2 rounded-lg border p-2">
                <Select value={item.tipo} onValueChange={(v) => atualizar(i, { tipo: v as "SERVICO" | "PECA" })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVICO">Serviço</SelectItem>
                    <SelectItem value="PECA">Peça</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={item.descricao} onChange={(e) => atualizar(i, { descricao: e.target.value })} placeholder="Descrição" className="h-8 text-xs" />
                <Input value={item.valor} onChange={(e) => atualizar(i, { valor: e.target.value })} placeholder="Valor" inputMode="decimal" className="h-8 text-xs" />
                <Input value={item.quantidade} onChange={(e) => atualizar(i, { quantidade: e.target.value })} inputMode="decimal" className="h-8 text-xs" />
                <Button type="button" variant="ghost" size="icon" className="mb-0.5" disabled={itens.length === 1} onClick={() => setItens((a) => a.filter((_, idx) => idx !== i))} aria-label="Remover">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-sm text-muted-foreground">
              <Wrench className="mr-1 inline size-3.5" />
              Total estimado:{" "}
              <span className="font-mono font-semibold text-foreground">
                {formatarMoeda(
                  itens.reduce((s, i) => s + (Number(String(i.valor).replace(",", ".")) || 0) * (Number(String(i.quantidade).replace(",", ".")) || 1), 0)
                )}
              </span>
            </p>
            <Button onClick={salvar} disabled={salvando || nome.trim().length < 2}>
              {salvando && <Loader2 className="size-4 animate-spin" />} Criar pacote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
