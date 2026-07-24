import type { Metadata } from "next";
import { format } from "date-fns";
import { CircleX, ShieldCheck, Wrench } from "lucide-react";
import { obterPortalPorToken, PROGRESSO_OS } from "@/modules/ordens/services/portal-service";
import { STATUS_OS_BADGE, STATUS_OS_LABEL } from "@/shared/constants/os";
import { formatarMoeda, paraNumero } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";
import { SISTEMA_LABEL } from "@/modules/ordens/schemas/os-schemas";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Acompanhe seu serviço" };

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const dados = await obterPortalPorToken(token);

  if (!dados) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CircleX className="size-10 text-destructive" />
            <p className="text-lg font-semibold">Link inválido</p>
            <p className="text-sm text-muted-foreground">
              Este link de acompanhamento não existe. Confirme com a oficina.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { os, historico } = dados;
  const oficina = os.oficina;
  const numero = String(os.numero).padStart(4, "0");
  const progresso = PROGRESSO_OS[os.status];
  const total = paraNumero(os.total);

  const itens = [
    ...os.servicosOS.map((s) => ({
      id: s.id,
      descricao: s.descricao,
      detalhe: "Serviço",
      valor: paraNumero(s.valor),
    })),
    ...os.pecasOS.map((p) => ({
      id: p.id,
      descricao: p.descricao,
      detalhe: `${paraNumero(p.quantidade)} × ${formatarMoeda(paraNumero(p.valorUnitario))}`,
      valor: paraNumero(p.valorUnitario) * paraNumero(p.quantidade),
    })),
  ];

  return (
    <div className="min-h-svh bg-muted/40 pb-16">
      <header className="border-b bg-primary py-6 text-primary-foreground">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-destaque text-destaque-foreground">
            <Wrench className="size-5" />
          </div>
          <div>
            <p className="font-bold">{oficina.name}</p>
            <p className="text-xs opacity-80">
              {[oficina.config?.telefone, [oficina.config?.cidade, oficina.config?.estado].filter(Boolean).join("/")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Serviço #{numero}</CardTitle>
              <Badge variant="outline" className={cn("font-normal", STATUS_OS_BADGE[os.status])}>
                {STATUS_OS_LABEL[os.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {os.cliente.nome} ·{" "}
              {[os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ")}{" "}
              {formatarPlaca(os.veiculo.placa)}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-destaque transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {os.status === "CANCELADO"
                ? "Serviço cancelado."
                : progresso >= 100
                  ? "Serviço concluído — seu veículo está pronto!"
                  : `Acompanhamento em tempo real (${progresso}%).`}
            </p>
          </CardContent>
        </Card>

        {os.diagnostico.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>O que encontramos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {os.diagnostico.map((d) => (
                <div key={d.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <Badge variant="outline" className="shrink-0">{SISTEMA_LABEL[d.sistema]}</Badge>
                  <p className="min-w-0 flex-1">{d.descricao}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {itens.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>Itens do serviço</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {itens.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.descricao}</p>
                    <p className="text-xs text-muted-foreground">{i.detalhe}</p>
                  </div>
                  <span className="shrink-0 font-mono">{formatarMoeda(i.valor)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span className="font-mono text-destaque">{formatarMoeda(total)}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {os.garantias.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>Garantias</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {os.garantias.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span>{g.descricao}</span>
                  <span className="text-xs text-muted-foreground">
                    até {format(g.validadeAte, "dd/MM/yyyy")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {historico.length > 0 ? (
          <Card>
            <CardHeader><CardTitle>Histórico do veículo</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {historico.map((h) => (
                <div key={h.id} className="flex items-center justify-between border-b pb-1.5 text-sm last:border-0 last:pb-0">
                  <span>
                    OS #{String(h.numero).padStart(4, "0")} ·{" "}
                    {format(h.dataConclusao ?? h.createdAt, "dd/MM/yyyy")}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatarMoeda(paraNumero(h.total))}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <p className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-4" /> Página segura de acompanhamento da {oficina.name}.
        </p>
      </main>
    </div>
  );
}
