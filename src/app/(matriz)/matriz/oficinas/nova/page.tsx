import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/shared/lib/session";
import { listarPlanos } from "@/modules/plataforma/services/matriz-service";
import { NovaOficinaForm } from "@/modules/plataforma/components/nova-oficina-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nova oficina · Matriz" };

export default async function NovaOficinaPage() {
  await requireSuperAdmin();
  const planos = await listarPlanos();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/matriz/oficinas" aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Nova oficina</h1>
          <p className="text-sm text-muted-foreground">
            Cria a empresa completa: cadastro, usuário dono (Proprietário),
            perfis de acesso e assinatura.
          </p>
        </div>
      </div>
      <NovaOficinaForm
        planos={planos
          .filter((p) => p.ativo)
          .map((p) => ({ id: p.id, nome: p.nome }))}
      />
    </div>
  );
}
