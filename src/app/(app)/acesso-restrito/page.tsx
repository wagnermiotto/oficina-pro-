import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Acesso restrito" };

/**
 * Destino dos gates de permissão (requirePermissaoPage). Fica dentro do grupo
 * (app) para herdar sidebar/header — o usuário continua no sistema.
 */
export default function AcessoRestritoPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="size-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Você não tem acesso a este módulo</p>
            <p className="text-sm text-muted-foreground">
              Seu perfil de acesso não inclui esta área. Se precisar, fale com o
              responsável pela oficina para ajustar suas permissões.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
