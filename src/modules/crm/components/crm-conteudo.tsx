"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TipoInteracao } from "@prisma/client";
import {
  BellRing,
  Check,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  ShieldX,
  Star,
} from "lucide-react";
import type { ResumoNps } from "../services/nps-service";
import { toast } from "sonner";
import { TIPO_INTERACAO_LABEL } from "../schemas/crm-schemas";
import {
  concluirLembreteAction,
  criarInteracaoAction,
} from "../actions/crm-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface LembreteLinha {
  id: string;
  cliente: string;
  clienteId: string;
  contato: string | null;
  mensagem: string;
  tipo: TipoInteracao;
  quando: string;
  atrasado: boolean;
}

export interface HistoricoLinha {
  id: string;
  cliente: string;
  clienteId: string;
  tipo: TipoInteracao;
  mensagem: string;
  data: string;
}

export interface GarantiaLinha {
  id: string;
  descricao: string;
  cliente: string;
  veiculo: string;
  osId: string;
  osNumero: number;
  validadeAte: string;
  vigente: boolean;
  diasRestantes: number;
}

export interface ClienteCRMOpcao {
  id: string;
  nome: string;
}

export interface NpsRespostaLinha {
  id: string;
  cliente: string;
  nota: number;
  comentario: string | null;
  osId: string;
  osNumero: number;
  quando: string;
}

function NovaInteracaoDialog({ clientes }: { clientes: ClienteCRMOpcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [tipo, setTipo] = useState("LIGACAO");
  const [mensagem, setMensagem] = useState("");
  const [proximoContato, setProximoContato] = useState("");

  async function salvar() {
    setSalvando(true);
    const resultado = await criarInteracaoAction({
      clienteId,
      tipo: tipo as "LIGACAO",
      mensagem,
      proximoContato,
    });
    setSalvando(false);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Interação registrada.");
    setAberto(false);
    setMensagem("");
    setProximoContato("");
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button className="bg-destaque text-destaque-foreground hover:bg-destaque/90">
          <Plus className="size-4" /> Registrar contato
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar contato / lembrete</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_INTERACAO_LABEL).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem / resumo *</Label>
            <Textarea
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Ex.: cliente pediu retorno sobre orçamento da revisão..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Agendar próximo contato (opcional)</Label>
            <Input
              type="date"
              value={proximoContato}
              onChange={(e) => setProximoContato(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CRMConteudoProps {
  lembretes: LembreteLinha[];
  historico: HistoricoLinha[];
  garantias: GarantiaLinha[];
  clientes: ClienteCRMOpcao[];
  npsResumo: ResumoNps;
  npsRespostas: NpsRespostaLinha[];
}

export function CRMConteudo({
  lembretes,
  historico,
  garantias,
  clientes,
  npsResumo,
  npsRespostas,
}: CRMConteudoProps) {
  const router = useRouter();

  async function concluir(id: string) {
    const resultado = await concluirLembreteAction(id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Lembrete concluído.");
    router.refresh();
  }

  return (
    <Tabs defaultValue="lembretes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="lembretes">
            Lembretes{" "}
            {lembretes.length > 0 && (
              <Badge className="ml-1 bg-destaque text-destaque-foreground">
                {lembretes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="garantias">Garantias</TabsTrigger>
          <TabsTrigger value="satisfacao">Satisfação</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <NovaInteracaoDialog clientes={clientes} />
      </div>

      <TabsContent value="lembretes" className="space-y-2 pt-3">
        {lembretes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum lembrete pendente. Registre um contato com data de retorno
              para criar lembretes.
            </CardContent>
          </Card>
        ) : (
          lembretes.map((lembrete) => (
            <div
              key={lembrete.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-lg border p-3",
                lembrete.atrasado && "border-destructive/40 bg-destructive/5"
              )}
            >
              <BellRing
                className={cn(
                  "size-5 shrink-0",
                  lembrete.atrasado ? "text-destructive" : "text-destaque"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <Link
                    href={`/clientes/${lembrete.clienteId}`}
                    className="hover:text-destaque hover:underline"
                  >
                    {lembrete.cliente}
                  </Link>
                  {lembrete.contato ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3" /> {lembrete.contato}
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  <MessageCircle className="mr-1 inline size-3.5" />
                  {lembrete.mensagem}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-normal",
                  lembrete.atrasado
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : "bg-destaque/15 text-destaque border-destaque/30"
                )}
              >
                {lembrete.atrasado ? "Atrasado · " : ""}
                {lembrete.quando}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => concluir(lembrete.id)}>
                <Check className="size-3.5" /> Concluir
              </Button>
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="garantias" className="space-y-2 pt-3">
        {garantias.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma garantia registrada. Garantias são criadas automaticamente
              quando uma OS é finalizada.
            </CardContent>
          </Card>
        ) : (
          garantias.map((garantia) => (
            <div
              key={garantia.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              {garantia.vigente ? (
                <ShieldCheck className="size-5 shrink-0 text-chart-5" />
              ) : (
                <ShieldX className="size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{garantia.descricao}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {garantia.cliente} · {garantia.veiculo} ·{" "}
                  <Link
                    href={`/ordens/${garantia.osId}`}
                    className="text-destaque hover:underline"
                  >
                    OS #{String(garantia.osNumero).padStart(4, "0")}
                  </Link>
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-normal",
                  garantia.vigente
                    ? "bg-chart-5/15 text-chart-5 border-chart-5/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {garantia.vigente
                  ? `Vigente · ${garantia.diasRestantes} dia${garantia.diasRestantes === 1 ? "" : "s"} restantes`
                  : `Expirada em ${garantia.validadeAte}`}
              </Badge>
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="satisfacao" className="space-y-4 pt-3">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4 sm:col-span-1">
            <p className="text-xs text-muted-foreground">NPS</p>
            <p
              className={cn(
                "text-3xl font-bold",
                npsResumo.score === null
                  ? "text-muted-foreground"
                  : npsResumo.score >= 50
                    ? "text-chart-5"
                    : npsResumo.score >= 0
                      ? "text-destaque"
                      : "text-destructive"
              )}
            >
              {npsResumo.score === null ? "—" : npsResumo.score}
            </p>
            <p className="text-xs text-muted-foreground">
              {npsResumo.totalRespostas} resposta
              {npsResumo.totalRespostas === 1 ? "" : "s"}
              {npsResumo.pendentes > 0 ? ` · ${npsResumo.pendentes} pendente(s)` : ""}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Nota média</p>
            <p className="text-2xl font-bold">
              {npsResumo.media === null ? "—" : npsResumo.media}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Promotores (9-10)</p>
            <p className="text-2xl font-bold text-chart-5">{npsResumo.promotores}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Detratores (0-6)</p>
            <p className="text-2xl font-bold text-destructive">{npsResumo.detratores}</p>
          </div>
        </div>

        {npsRespostas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma avaliação ainda. Gere o link de pesquisa numa OS entregue
              (botão “Pesquisa de satisfação”) e envie ao cliente.
            </CardContent>
          </Card>
        ) : (
          npsRespostas.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-start gap-3 rounded-lg border p-3"
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                  r.nota >= 9
                    ? "bg-chart-5/15 text-chart-5"
                    : r.nota >= 7
                      ? "bg-destaque/15 text-destaque"
                      : "bg-destructive/15 text-destructive"
                )}
              >
                {r.nota}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.cliente}{" "}
                  <Link
                    href={`/ordens/${r.osId}`}
                    className="text-xs text-destaque hover:underline"
                  >
                    OS #{String(r.osNumero).padStart(4, "0")}
                  </Link>
                </p>
                {r.comentario ? (
                  <p className="text-sm text-muted-foreground">
                    <Star className="mr-1 inline size-3.5" />“{r.comentario}”
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem comentário.</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{r.quando}</span>
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="historico" className="space-y-2 pt-3">
        {historico.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma interação registrada ainda.
            </CardContent>
          </Card>
        ) : (
          historico.map((interacao) => (
            <div
              key={interacao.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <Badge variant="outline" className="shrink-0">
                {TIPO_INTERACAO_LABEL[interacao.tipo]}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link
                    href={`/clientes/${interacao.clienteId}`}
                    className="font-medium hover:text-destaque hover:underline"
                  >
                    {interacao.cliente}
                  </Link>{" "}
                  — {interacao.mensagem}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {interacao.data}
              </span>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
