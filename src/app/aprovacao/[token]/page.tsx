import type { Metadata } from "next";
import { format } from "date-fns";
import {
  CircleCheck,
  CircleX,
  Clock,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { obterOrcamentoPorToken } from "@/modules/ordens/services/aprovacao-service";
import {
  AprovacaoForm,
  type ItemAprovacao,
} from "@/modules/ordens/components/aprovacao-form";
import {
  SISTEMA_LABEL,
  URGENCIA_BADGE,
  URGENCIA_LABEL,
} from "@/modules/ordens/schemas/os-schemas";
import { formatarMoeda, paraNumero } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aprovação de orçamento" };

function TelaAviso({
  icone,
  titulo,
  mensagem,
}: {
  icone: React.ReactNode;
  titulo: string;
  mensagem: string;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          {icone}
          <p className="text-lg font-semibold">{titulo}</p>
          <p className="text-sm text-muted-foreground">{mensagem}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AprovacaoPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const dados = await obterOrcamentoPorToken(token);

  if (!dados) {
    return (
      <TelaAviso
        icone={<CircleX className="size-10 text-destructive" />}
        titulo="Link inválido"
        mensagem="Este link de aprovação não existe. Confirme com a oficina se o endereço está correto."
      />
    );
  }

  const { aprovacao, expirada } = dados;
  const os = aprovacao.ordemServico;
  const oficina = aprovacao.oficina;
  const numero = String(os.numero).padStart(4, "0");

  if (expirada) {
    return (
      <TelaAviso
        icone={<Clock className="size-10 text-destaque" />}
        titulo="Link expirado"
        mensagem="Este orçamento expirou. Peça à oficina um novo link de aprovação."
      />
    );
  }

  if (aprovacao.status !== "PENDENTE") {
    return (
      <TelaAviso
        icone={<CircleCheck className="size-10 text-chart-5" />}
        titulo="Resposta já registrada"
        mensagem={`Este orçamento já foi respondido${aprovacao.nomeAprovador ? ` por ${aprovacao.nomeAprovador}` : ""}${aprovacao.respondidoEm ? ` em ${format(aprovacao.respondidoEm, "dd/MM/yyyy 'às' HH:mm")}` : ""}. Em caso de dúvida, fale com a oficina.`}
      />
    );
  }

  const itens: ItemAprovacao[] = [
    ...os.servicosOS.map((s) => ({
      tipo: "servico" as const,
      id: s.id,
      descricao: s.descricao,
      detalhe: null,
      valor: paraNumero(s.valor),
    })),
    ...os.pecasOS.map((p) => ({
      tipo: "peca" as const,
      id: p.id,
      descricao: p.descricao,
      detalhe: `${paraNumero(p.quantidade)} × ${formatarMoeda(paraNumero(p.valorUnitario))}`,
      valor: paraNumero(p.valorUnitario) * paraNumero(p.quantidade),
    })),
  ];

  return (
    <div className="min-h-svh bg-muted/40 pb-16">
      <header className="border-b bg-primary py-6 text-primary-foreground">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4">
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

      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Orçamento — OS #{numero}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{os.cliente.nome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Veículo</p>
              <p className="font-medium">
                {[os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ")} ·{" "}
                {formatarPlaca(os.veiculo.placa)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Garantia</p>
              <p className="font-medium">{os.garantiaDias} dias</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Validade do orçamento</p>
              <p className="font-medium">
                {format(aprovacao.expiraEm, "dd/MM/yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        {os.diagnostico.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>O que encontramos no seu veículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {os.diagnostico.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  <Badge variant="outline" className="shrink-0">
                    {SISTEMA_LABEL[item.sistema]}
                  </Badge>
                  <p className="min-w-0 flex-1">{item.descricao}</p>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 font-normal", URGENCIA_BADGE[item.urgencia])}
                  >
                    {URGENCIA_LABEL[item.urgencia]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {itens.length === 0 ? (
          <TelaAviso
            icone={<Clock className="size-10 text-destaque" />}
            titulo="Orçamento em preparação"
            mensagem="A oficina ainda está lançando os itens. Tente novamente em instantes."
          />
        ) : (
          <AprovacaoForm token={token} itens={itens} />
        )}

        <p className="flex items-center justify-center gap-2 pt-4 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          Página segura — sua resposta é registrada com data, hora e IP.
        </p>
      </main>
    </div>
  );
}
