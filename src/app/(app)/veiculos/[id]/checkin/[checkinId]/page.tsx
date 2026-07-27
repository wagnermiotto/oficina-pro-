import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Check, X } from "lucide-react";
import { requireOficina, requirePermissaoPage } from "@/shared/lib/session";
import {
  NIVEL_COMBUSTIVEL_LABEL,
  TIPO_AVARIA_LABEL,
} from "@/modules/checkin/schemas/checkin-schemas";
import { formatarPlaca } from "@/shared/utils/placa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Detalhes do check-in" };

export default async function CheckInDetalhePage({
  params,
}: {
  params: Promise<{ id: string; checkinId: string }>;
}) {
  const ctx = await requireOficina();
  await requirePermissaoPage(ctx, "ordens");
  const { db } = ctx;
  const { id, checkinId } = await params;

  const checkIn = await db.checkIn.findUnique({
    where: { id: checkinId },
    include: {
      veiculo: { select: { id: true, marca: true, modelo: true, placa: true } },
      cliente: { select: { nome: true } },
      avarias: { where: { deletedAt: null } },
    },
  });
  if (!checkIn || checkIn.veiculoId !== id) notFound();

  const midias = await db.midia.findMany({
    where: { entidade: "checkin", entidadeId: checkIn.id, tipo: { in: ["FOTO", "VIDEO"] } },
    orderBy: { createdAt: "asc" },
  });

  const itens: [string, boolean][] = [
    ["Chave reserva", checkIn.chaveReserva],
    ["Estepe", checkIn.estepe],
    ["Macaco", checkIn.macaco],
    ["Triângulo", checkIn.triangulo],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/veiculos/${checkIn.veiculo.id}`} aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Check-in de {format(checkIn.createdAt, "dd/MM/yyyy 'às' HH:mm")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[checkIn.veiculo.marca, checkIn.veiculo.modelo].filter(Boolean).join(" ")} ·{" "}
            {formatarPlaca(checkIn.veiculo.placa)} · {checkIn.cliente.nome}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Condições registradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Quilometragem</p>
              <p className="font-medium">
                {checkIn.quilometragem != null
                  ? `${checkIn.quilometragem.toLocaleString("pt-BR")} km`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Combustível</p>
              <p className="font-medium">
                {checkIn.nivelCombustivel
                  ? NIVEL_COMBUSTIVEL_LABEL[checkIn.nivelCombustivel]
                  : "—"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Objetos deixados</p>
              <p className="font-medium">{checkIn.objetosDeixados ?? "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {itens.map(([rotulo, presente]) => (
              <div
                key={rotulo}
                className="flex items-center gap-2 rounded-lg border p-2.5"
              >
                {presente ? (
                  <Check className="size-4 text-chart-5" />
                ) : (
                  <X className="size-4 text-muted-foreground" />
                )}
                <span className={presente ? "" : "text-muted-foreground"}>
                  {rotulo}
                </span>
              </div>
            ))}
          </div>
          {checkIn.observacoes ? (
            <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-muted-foreground">
              {checkIn.observacoes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avarias ({checkIn.avarias.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {checkIn.avarias.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma avaria registrada na entrada.
            </p>
          ) : (
            <ul className="space-y-2">
              {checkIn.avarias.map((avaria) => (
                <li
                  key={avaria.id}
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <Badge variant="outline">{TIPO_AVARIA_LABEL[avaria.tipo]}</Badge>
                  <span className="font-medium">{avaria.local}</span>
                  {avaria.descricao ? (
                    <span className="text-muted-foreground">— {avaria.descricao}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {midias.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Fotos e vídeos ({midias.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {midias.map((midia) =>
                midia.tipo === "VIDEO" ? (
                  <video
                    key={midia.id}
                    src={midia.url}
                    controls
                    className="aspect-video w-full rounded-lg border object-cover"
                  />
                ) : (
                  <a
                    key={midia.id}
                    href={midia.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block aspect-video overflow-hidden rounded-lg border"
                  >
                    <Image
                      src={midia.url}
                      alt={midia.nome ?? "Foto do check-in"}
                      fill
                      unoptimized
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                )
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {checkIn.assinaturaUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Assinatura do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={checkIn.assinaturaUrl}
                alt="Assinatura do cliente"
                className="mx-auto max-h-32"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
