import { getPermissoes, isSuperAdmin, requireOficina } from "@/shared/lib/session";
import { obterNomeOficina } from "@/shared/lib/oficina-cache";
import { MODULOS_SISTEMA, chave } from "@/shared/permissoes/catalogo";
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
  const [nomeOficina, permissoes, superAdmin] = await Promise.all([
    obterNomeOficina(ctx.oficinaId),
    getPermissoes(ctx),
    isSuperAdmin(ctx.usuario.id),
  ]);
  const modulosVisiveis = superAdmin
    ? Object.keys(MODULOS_SISTEMA)
    : Object.keys(MODULOS_SISTEMA).filter((modulo) =>
        permissoes.chaves.has(chave(modulo, "VISUALIZAR"))
      );

  return (
    <SidebarProvider>
      <AppSidebar
        nomeOficina={nomeOficina}
        usuario={{ nome: ctx.usuario.nome, email: ctx.usuario.email }}
        modulosVisiveis={modulosVisiveis}
      />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
