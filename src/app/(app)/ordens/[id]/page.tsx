import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Car,
  CircleCheck,
  ClipboardList,
  History,
  User,
} from "lucide-react";
import { requireOficina } from "@/shared/lib/session";
import { iaDisponivel } from "@/shared/lib/ai";
import { gerarPixCopiaECola } from "@/shared/utils/pix";
import { PixCard } from "@/modules/ordens/components/pix-card";
import { obterOS, listarMecanicos } from "@/modules/ordens/services/os-service";
import { OSIACard } from "@/modules/ordens/components/os-ia-card";
import { OSStatusAcoes } from "@/modules/ordens/components/os-status-acoes";
import { OSItensCards } from "@/modules/ordens/components/os-itens-cards";
import { OSAjustesCard } from "@/modules/ordens/components/os-ajustes-card";
import { STATUS_OS_BADGE, STATUS_OS_LABEL } from "@/shared/constants/os";
import { paraNumero } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ordem de Serviço" };

const STATUS_NAO_EDITAVEIS = new Set(["FINALIZADO", "CANCELADO", "ENTREGUE"]);

export default async function OSDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireOficina();
  const { id } = await params;
  const [os, mecanicos, catalogoServicos, catalogoPecas, config] =
    await Promise.all([
    obterOS(db, id),
    listarMecanicos(db),
    db.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, precoBase: true },
    }),
    db.peca.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        precoVenda: true,
        quantidade: true,
        unidade: true,
      },
    }),
    db.oficinaConfig.findFirst({
      select: { pixChave: true, pixNomeRecebedor: true, pixCidade: true },
    }),
  ]);
  if (!os) notFound();

  const editavel = !STATUS_NAO_EDITAVEIS.has(os.status);
  const numero = String(os.numero).padStart(4, "0");
  const aprovacaoRespondida = os.aprovacoes.find((a) => a.respondidoEm);
  const totalOS = paraNumero(os.total);
  const pixCodigo =
    config?.pixChave && totalOS > 0
      ? gerarPixCopiaECola({
          chave: config.pixChave,
          nomeRecebedor: config.pixNomeRecebedor ?? "",
          cidade: config.pixCidade ?? "",
          valor: totalOS,
          txid: `OS${numero}`,
        })
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ordens" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight">OS #{numero}</h2>
              <Badge
                variant="outline"
                className={cn("font-normal", STATUS_OS_BADGE[os.status])}
              >
                {STATUS_OS_LABEL[os.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Entrada em {format(os.dataEntrada, "dd/MM/yyyy 'às' HH:mm")}
              {os.dataPrevista
                ? ` · Previsão: ${format(os.dataPrevista, "dd/MM/yyyy")}`
                : ""}
            </p>
          </div>
        </div>
        <OSStatusAcoes osId={os.id} status={os.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <User className="size-5" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/clientes/${os.cliente.id}`}
                className="font-medium hover:text-destaque hover:underline"
              >
                {os.cliente.nome}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {os.cliente.whatsapp ?? os.cliente.telefone ?? "Sem contato"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <Car className="size-5" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/veiculos/${os.veiculo.id}`}
                className="font-medium hover:text-destaque hover:underline"
              >
                {[os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ") ||
                  "Veículo"}{" "}
                · {formatarPlaca(os.veiculo.placa)}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {os.descricaoProblema ?? "Sem problema relatado"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {aprovacaoRespondida ? (
        <Card className="border-chart-5/40 bg-chart-5/5 py-4">
          <CardContent className="flex items-center gap-3 px-4 text-sm">
            <CircleCheck className="size-5 shrink-0 text-chart-5" />
            <p>
              Orçamento respondido por{" "}
              <strong>{aprovacaoRespondida.nomeAprovador}</strong> em{" "}
              {format(aprovacaoRespondida.respondidoEm!, "dd/MM/yyyy 'às' HH:mm")}
              {aprovacaoRespondida.ipAprovador
                ? ` (IP ${aprovacaoRespondida.ipAprovador})`
                : ""}
              .
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <OSItensCards
          osId={os.id}
          editavel={editavel}
          servicos={os.servicosOS.map((s) => ({
            id: s.id,
            descricao: s.descricao,
            valor: paraNumero(s.valor),
            status: s.status,
          }))}
          pecas={os.pecasOS.map((p) => ({
            id: p.id,
            descricao: p.descricao,
            quantidade: paraNumero(p.quantidade),
            valorUnitario: paraNumero(p.valorUnitario),
            status: p.status,
            baixaEfetuada: p.baixaEfetuada,
          }))}
          diagnostico={os.diagnostico.map((d) => ({
            id: d.id,
            sistema: d.sistema,
            descricao: d.descricao,
            urgencia: d.urgencia,
            valorEstimado: d.valorEstimado != null ? paraNumero(d.valorEstimado) : null,
            recomendacao: d.recomendacao,
          }))}
          catalogoServicos={catalogoServicos.map((s) => ({
            id: s.id,
            nome: s.nome,
            precoBase: paraNumero(s.precoBase),
          }))}
          catalogoPecas={catalogoPecas.map((p) => ({
            id: p.id,
            nome: p.nome,
            precoVenda: paraNumero(p.precoVenda),
            quantidade: paraNumero(p.quantidade),
            unidade: p.unidade,
          }))}
        />

        <div className="space-y-4">
          <OSAjustesCard
            osId={os.id}
            editavel={editavel}
            mecanicos={mecanicos.map((m) => ({ userId: m.userId, nome: m.nome }))}
            mecanicoId={os.mecanicoId}
            descontoValor={paraNumero(os.descontoValor)}
            impostoPercent={paraNumero(os.impostoPercent)}
            observacoesInternas={os.observacoesInternas}
            totalServicos={paraNumero(os.totalServicos)}
            totalPecas={paraNumero(os.totalPecas)}
            total={paraNumero(os.total)}
          />

          {pixCodigo ? <PixCard codigo={pixCodigo} valor={totalOS} /> : null}

          {iaDisponivel() && editavel ? <OSIACard osId={os.id} /> : null}

          {os.checkIn ? (
            <Card className="py-4">
              <CardContent className="flex items-center gap-3 px-4 text-sm">
                <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                <Link
                  href={`/veiculos/${os.veiculo.id}/checkin/${os.checkIn.id}`}
                  className="hover:text-destaque hover:underline"
                >
                  Check-in vinculado ({os.checkIn.avarias.length} avaria
                  {os.checkIn.avarias.length === 1 ? "" : "s"})
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {os.historicos.map((evento) => (
                  <li key={evento.id} className="flex gap-3 text-sm">
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-destaque" />
                    <div>
                      <p className="font-medium">
                        {evento.statusAnterior
                          ? `${STATUS_OS_LABEL[evento.statusAnterior]} → ${STATUS_OS_LABEL[evento.statusNovo]}`
                          : STATUS_OS_LABEL[evento.statusNovo]}
                      </p>
                      {evento.observacao ? (
                        <p className="text-xs text-muted-foreground">
                          {evento.observacao}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {format(evento.createdAt, "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
