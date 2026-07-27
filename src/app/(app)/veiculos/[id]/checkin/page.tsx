import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOficina, requirePermissaoPage } from "@/shared/lib/session";
import { CheckInForm } from "@/modules/checkin/components/checkin-form";
import { formatarPlaca } from "@/shared/utils/placa";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check-in do veículo" };

export default async function NovoCheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireOficina();
  await requirePermissaoPage(ctx, "ordens", "CRIAR");
  const { db } = ctx;
  const { id } = await params;
  const veiculo = await db.veiculo.findUnique({
    where: { id },
    include: { cliente: { select: { nome: true } } },
  });
  if (!veiculo) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/veiculos/${veiculo.id}`} aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Check-in de entrada</h2>
          <p className="text-sm text-muted-foreground">
            {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")} ·{" "}
            {formatarPlaca(veiculo.placa)} · {veiculo.cliente.nome}
          </p>
        </div>
      </div>
      <CheckInForm veiculoId={veiculo.id} />
    </div>
  );
}
