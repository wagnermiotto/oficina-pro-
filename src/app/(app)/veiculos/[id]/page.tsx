import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bike,
  Car,
  ClipboardList,
  Gauge,
  User,
} from "lucide-react";
import { requireOficina } from "@/shared/lib/session";
import {
  obterVeiculo,
  listarClientesParaSelecao,
} from "@/modules/veiculos/services/veiculos-service";
import { VeiculoDialog } from "@/modules/veiculos/components/veiculo-dialog";
import {
  COMBUSTIVEL_LABEL,
  CAMBIO_LABEL,
} from "@/modules/veiculos/schemas/veiculo-schemas";
import { formatarPlaca } from "@/shared/utils/placa";
import { formatarMoeda } from "@/shared/utils/moeda";
import { STATUS_OS_BADGE, STATUS_OS_LABEL } from "@/shared/constants/os";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalhes do veículo" };

export default async function VeiculoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireOficina();
  const { id } = await params;
  const [veiculo, clientesSelecao] = await Promise.all([
    obterVeiculo(db, id),
    listarClientesParaSelecao(db),
  ]);
  if (!veiculo) notFound();

  const especificacoes: [string, string][] = [
    ["Marca", veiculo.marca ?? "—"],
    ["Modelo", veiculo.modelo ?? "—"],
    [
      "Ano",
      veiculo.ano
        ? `${veiculo.ano}${veiculo.anoModelo ? `/${veiculo.anoModelo}` : ""}`
        : "—",
    ],
    ["Cor", veiculo.cor ?? "—"],
    ["Combustível", veiculo.combustivel ? COMBUSTIVEL_LABEL[veiculo.combustivel]! : "—"],
    ["Câmbio", veiculo.cambio ? CAMBIO_LABEL[veiculo.cambio]! : "—"],
    ["Chassi", veiculo.chassi ?? "—"],
    ["RENAVAM", veiculo.renavam ?? "—"],
    ["Nº do motor", veiculo.numeroMotor ?? "—"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/veiculos" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
              {veiculo.tipo === "MOTO" ? (
                <Bike className="size-6" />
              ) : (
                <Car className="size-6" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") || "Veículo"}
              </h2>
              <p className="font-mono text-sm text-muted-foreground">
                {formatarPlaca(veiculo.placa)}
                {veiculo.quilometragem != null
                  ? ` · ${veiculo.quilometragem.toLocaleString("pt-BR")} km`
                  : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <VeiculoDialog
            clientes={clientesSelecao.map((c) => ({ id: c.id, nome: c.nome }))}
            veiculoId={veiculo.id}
            valoresIniciais={{
              clienteId: veiculo.clienteId,
              tipo: veiculo.tipo,
              placa: veiculo.placa,
              marca: veiculo.marca ?? "",
              modelo: veiculo.modelo ?? "",
              ano: veiculo.ano != null ? String(veiculo.ano) : "",
              anoModelo: veiculo.anoModelo != null ? String(veiculo.anoModelo) : "",
              cor: veiculo.cor ?? "",
              chassi: veiculo.chassi ?? "",
              renavam: veiculo.renavam ?? "",
              numeroMotor: veiculo.numeroMotor ?? "",
              quilometragem:
                veiculo.quilometragem != null ? String(veiculo.quilometragem) : "",
              combustivel: veiculo.combustivel ?? "",
              cambio: veiculo.cambio ?? "",
              observacoes: veiculo.observacoes ?? "",
            }}
            trigger={<Button variant="outline">Editar</Button>}
          />
          <Button
            asChild
            className="bg-destaque text-destaque-foreground hover:bg-destaque/90"
          >
            <Link href={`/veiculos/${veiculo.id}/checkin`}>
              <ClipboardList className="size-4" /> Fazer check-in
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Especificações</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {especificacoes.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                  <dd className="font-medium">{valor}</dd>
                </div>
              ))}
            </dl>
            {veiculo.observacoes ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {veiculo.observacoes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proprietário</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/clientes/${veiculo.cliente.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <User className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{veiculo.cliente.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {veiculo.cliente.whatsapp ?? veiculo.cliente.telefone ?? ""}
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Check-ins ({veiculo.checkIns.length})</CardTitle>
            <CardDescription>Registros de entrada do veículo</CardDescription>
          </CardHeader>
          <CardContent>
            {veiculo.checkIns.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum check-in registrado.
              </p>
            ) : (
              <ul className="divide-y">
                {veiculo.checkIns.map((checkIn) => (
                  <li key={checkIn.id}>
                    <Link
                      href={`/veiculos/${veiculo.id}/checkin/${checkIn.id}`}
                      className="flex items-center gap-4 py-3 transition-colors hover:text-destaque"
                    >
                      <ClipboardList className="size-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">
                        {format(checkIn.createdAt, "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                      {checkIn.quilometragem != null ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Gauge className="size-3.5" />
                          {checkIn.quilometragem.toLocaleString("pt-BR")} km
                        </span>
                      ) : null}
                      <Badge variant="outline">
                        {checkIn.avarias.length} avaria
                        {checkIn.avarias.length === 1 ? "" : "s"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ordens de serviço</CardTitle>
            <CardDescription>Histórico de manutenções</CardDescription>
          </CardHeader>
          <CardContent>
            {veiculo.ordens.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma ordem de serviço.
              </p>
            ) : (
              <ul className="divide-y">
                {veiculo.ordens.map((os) => (
                  <li key={os.id} className="flex items-center gap-4 py-3">
                    <span className="font-mono text-sm">
                      #{String(os.numero).padStart(4, "0")}
                    </span>
                    <span className="flex-1 text-xs text-muted-foreground">
                      {format(os.dataEntrada, "dd/MM/yyyy")}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("font-normal", STATUS_OS_BADGE[os.status])}
                    >
                      {STATUS_OS_LABEL[os.status]}
                    </Badge>
                    <span className="font-mono text-sm">{formatarMoeda(os.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
