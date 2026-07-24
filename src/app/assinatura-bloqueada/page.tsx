import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Wrench } from "lucide-react";
import { requireSessao } from "@/shared/lib/session";
import { prisma } from "@/shared/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Assinatura bloqueada" };

export default async function AssinaturaBloqueadaPage() {
  const sessao = await requireSessao();
  const oficinaId = sessao.session.activeOrganizationId;
  const assinatura = oficinaId
    ? await prisma.assinatura.findUnique({
        where: { oficinaId },
        select: { status: true, vencimento: true, plano: { select: { nome: true } } },
      })
    : null;

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Lock className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Acesso temporariamente bloqueado</p>
            <p className="text-sm text-muted-foreground">
              A assinatura da sua oficina está{" "}
              {assinatura?.status === "SUSPENSO" ? "suspensa" : "com pagamento pendente"}.
              Regularize para voltar a usar o sistema — seus dados estão seguros.
            </p>
          </div>
          {assinatura ? (
            <div className="w-full rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-medium">{assinatura.plano.nome}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Venceu em</span>
                <span className="font-medium">
                  {assinatura.vencimento.toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          ) : null}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wrench className="size-3.5" /> Fale com o suporte da plataforma para regularizar.
          </p>
          <Button variant="outline" asChild>
            <Link href="/login">Sair</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
