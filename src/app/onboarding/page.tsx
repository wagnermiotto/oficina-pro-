import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { requireSessao } from "@/shared/lib/session";
import { OnboardingForm } from "@/modules/auth/components/onboarding-form";

export const metadata: Metadata = { title: "Configurar oficina" };

export default async function OnboardingPage() {
  const sessao = await requireSessao();
  if (sessao.session.activeOrganizationId) redirect("/dashboard");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-background to-muted/60 p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-destaque text-destaque-foreground shadow-lg">
          <Wrench className="size-6" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight">OficinaPro</p>
          <p className="text-xs text-muted-foreground">Quase lá!</p>
        </div>
      </div>
      <div className="w-full max-w-sm">
        <OnboardingForm nomeUsuario={sessao.user.name} />
      </div>
    </div>
  );
}
