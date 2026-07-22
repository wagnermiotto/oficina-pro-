"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatarMoeda } from "@/shared/utils/moeda";
import {
  SISTEMA_LABEL,
  URGENCIA_BADGE,
  URGENCIA_LABEL,
} from "../schemas/os-schemas";
import {
  adicionarDiagnosticoOSAction,
  adicionarPecaOSAction,
  adicionarServicoOSAction,
  removerDiagnosticoOSAction,
  removerPecaOSAction,
  removerServicoOSAction,
} from "../actions/os-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_ITEM_BADGE: Record<string, string> = {
  PENDENTE: "bg-muted text-muted-foreground",
  APROVADO: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  RECUSADO: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_ITEM_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
};

export interface ServicoOSLinha {
  id: string;
  descricao: string;
  valor: number;
  status: string;
}

export interface PecaOSLinha {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  status: string;
  baixaEfetuada: boolean;
}

export interface DiagnosticoLinha {
  id: string;
  sistema: string;
  descricao: string;
  urgencia: string;
  valorEstimado: number | null;
  recomendacao: string | null;
}

export interface CatalogoServico {
  id: string;
  nome: string;
  precoBase: number;
}

export interface CatalogoPeca {
  id: string;
  nome: string;
  precoVenda: number;
  quantidade: number;
  unidade: string;
}

interface OSItensCardsProps {
  osId: string;
  editavel: boolean;
  servicos: ServicoOSLinha[];
  pecas: PecaOSLinha[];
  diagnostico: DiagnosticoLinha[];
  catalogoServicos: CatalogoServico[];
  catalogoPecas: CatalogoPeca[];
}

export function OSItensCards({
  osId,
  editavel,
  servicos,
  pecas,
  diagnostico,
  catalogoServicos,
  catalogoPecas,
}: OSItensCardsProps) {
  const router = useRouter();

  async function remover(
    acao: (osId: string, itemId: string) => Promise<{ ok: boolean; erro?: string }>,
    itemId: string
  ) {
    const resultado = await acao(osId, itemId);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Item removido.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Diagnóstico técnico</CardTitle>
          {editavel && <DialogDiagnostico osId={osId} />}
        </CardHeader>
        <CardContent>
          {diagnostico.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum item de diagnóstico.
            </p>
          ) : (
            <ul className="space-y-2">
              {diagnostico.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  <Badge variant="outline" className="shrink-0">
                    {SISTEMA_LABEL[item.sistema]}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p>{item.descricao}</p>
                    {item.recomendacao ? (
                      <p className="text-xs text-muted-foreground">
                        Recomendação: {item.recomendacao}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 font-normal", URGENCIA_BADGE[item.urgencia])}
                  >
                    {URGENCIA_LABEL[item.urgencia]}
                  </Badge>
                  {item.valorEstimado != null ? (
                    <span className="shrink-0 font-mono text-xs">
                      {formatarMoeda(item.valorEstimado)}
                    </span>
                  ) : null}
                  {editavel && (
                    <button
                      type="button"
                      onClick={() => remover(removerDiagnosticoOSAction, item.id)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Serviços (mão de obra)</CardTitle>
          {editavel && (
            <DialogServico osId={osId} catalogo={catalogoServicos} />
          )}
        </CardHeader>
        <CardContent>
          {servicos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum serviço lançado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {editavel && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.descricao}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("font-normal", STATUS_ITEM_BADGE[item.status])}
                      >
                        {STATUS_ITEM_LABEL[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatarMoeda(item.valor)}
                    </TableCell>
                    {editavel && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => remover(removerServicoOSAction, item.id)}
                          aria-label="Remover serviço"
                        >
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Peças</CardTitle>
          {editavel && <DialogPeca osId={osId} catalogo={catalogoPecas} />}
        </CardHeader>
        <CardContent>
          {pecas.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma peça lançada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Unitário</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {editavel && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pecas.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.descricao}
                      {item.baixaEfetuada ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          baixa no estoque
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantidade}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatarMoeda(item.valorUnitario)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("font-normal", STATUS_ITEM_BADGE[item.status])}
                      >
                        {STATUS_ITEM_LABEL[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatarMoeda(item.quantidade * item.valorUnitario)}
                    </TableCell>
                    {editavel && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => remover(removerPecaOSAction, item.id)}
                          aria-label="Remover peça"
                        >
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Dialogs de adição -------------------------------------------------------

function DialogServico({
  osId,
  catalogo,
}: {
  osId: string;
  catalogo: CatalogoServico[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [servicoId, setServicoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  function aoEscolherCatalogo(id: string) {
    setServicoId(id);
    const servico = catalogo.find((s) => s.id === id);
    if (servico) {
      setDescricao(servico.nome);
      setValor(String(servico.precoBase));
    }
  }

  async function salvar() {
    setSalvando(true);
    const resultado = await adicionarServicoOSAction(osId, {
      servicoId,
      descricao,
      valor,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Serviço adicionado.");
    setAberto(false);
    setServicoId("");
    setDescricao("");
    setValor("");
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar serviço</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Serviço do catálogo (opcional)</Label>
            <Select value={servicoId} onValueChange={aoEscolherCatalogo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher do catálogo..." />
              </SelectTrigger>
              <SelectContent>
                {catalogo.map((servico) => (
                  <SelectItem key={servico.id} value={servico.id}>
                    {servico.nome} — {formatarMoeda(servico.precoBase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Troca de pastilhas dianteiras"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="150,00"
              inputMode="decimal"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              Adicionar serviço
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogPeca({
  osId,
  catalogo,
}: {
  osId: string;
  catalogo: CatalogoPeca[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pecaId, setPecaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [valorUnitario, setValorUnitario] = useState("");

  function aoEscolherCatalogo(id: string) {
    setPecaId(id);
    const peca = catalogo.find((p) => p.id === id);
    if (peca) {
      setDescricao(peca.nome);
      setValorUnitario(String(peca.precoVenda));
    }
  }

  async function salvar() {
    setSalvando(true);
    const resultado = await adicionarPecaOSAction(osId, {
      pecaId,
      descricao,
      quantidade,
      valorUnitario,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    if (resultado.erro) toast.warning(resultado.erro);
    toast.success("Peça adicionada.");
    setAberto(false);
    setPecaId("");
    setDescricao("");
    setQuantidade("1");
    setValorUnitario("");
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar peça</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Peça do estoque (opcional)</Label>
            <Select value={pecaId} onValueChange={aoEscolherCatalogo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher do estoque..." />
              </SelectTrigger>
              <SelectContent>
                {catalogo.map((peca) => (
                  <SelectItem key={peca.id} value={peca.id}>
                    {peca.nome} — {formatarMoeda(peca.precoVenda)} (
                    {peca.quantidade} {peca.unidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Peças do estoque têm baixa automática quando a OS entra em execução.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Filtro de óleo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor unitário (R$)</Label>
              <Input
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                placeholder="35,00"
                inputMode="decimal"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              Adicionar peça
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogDiagnostico({ osId }: { osId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sistema, setSistema] = useState("MOTOR");
  const [urgencia, setUrgencia] = useState("MEDIA");
  const [descricao, setDescricao] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [recomendacao, setRecomendacao] = useState("");

  async function salvar() {
    setSalvando(true);
    const resultado = await adicionarDiagnosticoOSAction(osId, {
      sistema: sistema as "MOTOR",
      urgencia: urgencia as "MEDIA",
      descricao,
      valorEstimado,
      recomendacao,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Item de diagnóstico adicionado.");
    setAberto(false);
    setDescricao("");
    setValorEstimado("");
    setRecomendacao("");
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Item de diagnóstico</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sistema</Label>
              <Select value={sistema} onValueChange={setSistema}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SISTEMA_LABEL).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Urgência</Label>
              <Select value={urgencia} onValueChange={setUrgencia}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(URGENCIA_LABEL).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição do problema</Label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: pastilhas dianteiras com 90% de desgaste"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor estimado (R$)</Label>
              <Input
                value={valorEstimado}
                onChange={(e) => setValorEstimado(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Recomendação</Label>
              <Input
                value={recomendacao}
                onChange={(e) => setRecomendacao(e.target.value)}
                placeholder="Substituição imediata"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              Adicionar item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
