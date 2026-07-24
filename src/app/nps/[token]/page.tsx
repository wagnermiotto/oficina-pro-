import type { Metadata } from "next";
import { format } from "date-fns";
import { CircleCheck, CircleX, ShieldCheck, Wrench } from "lucide-react";
import { obterPesquisaPorToken } from "@/modules/crm/services/nps-service";
import { NpsForm } from "@/modules/crm/components/nps-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Avaliação de atendimento" };

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

export default async function NpsPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const pesquisa = await obterPesquisaPorToken(token);

  if (!pesquisa) {
    return (
      <TelaAviso
        icone={<CircleX className="size-10 text-destructive" />}
        titulo="Link inválido"
        mensagem="Esta pesquisa não existe. Confirme com a oficina se o endereço está correto."
      />
    );
  }

  if (pesquisa.respondidoEm) {
    return (
      <TelaAviso
        icone={<CircleCheck className="size-10 text-chart-5" />}
        titulo="Avaliação já registrada"
        mensagem={`Você já avaliou este atendimento em ${format(pesquisa.respondidoEm, "dd/MM/yyyy 'às' HH:mm")}. Obrigado!`}
      />
    );
  }

  const oficina = pesquisa.oficina;
  const numero = String(pesquisa.ordemServico.numero).padStart(4, "0");
  const primeiroNome = pesquisa.cliente.nome.split(" ")[0];

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
              {[
                oficina.config?.telefone,
                [oficina.config?.cidade, oficina.config?.estado]
                  .filter(Boolean)
                  .join("/"),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {primeiroNome}, como foi seu atendimento?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              De 0 a 10, qual a chance de você recomendar a {oficina.name} a um
              amigo? (referente à OS #{numero})
            </p>
          </CardHeader>
          <CardContent>
            <NpsForm token={token} />
          </CardContent>
        </Card>

        <p className="flex items-center justify-center gap-2 pt-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />
          Sua avaliação é confidencial e ajuda a melhorar o atendimento.
        </p>
      </main>
    </div>
  );
}
