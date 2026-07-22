import { requireOficina } from "@/shared/lib/session";
import { prisma } from "@/shared/lib/prisma";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/layout/app-sidebar";
import { AppHeader } from "@/shared/components/layout/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireOficina();
  const oficina = await prisma.organization.findUnique({
    where: { id: ctx.oficinaId },
    select: { name: true },
  });

  return (
    <SidebarProvider>
      <AppSidebar
        nomeOficina={oficina?.name ?? "Minha oficina"}
        usuario={{ nome: ctx.usuario.nome, email: ctx.usuario.email }}
      />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
