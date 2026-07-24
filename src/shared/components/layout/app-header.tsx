"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";

const TITULOS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/ordens": "Ordens de Serviço",
  "/agenda": "Agenda",
  "/clientes": "Clientes",
  "/veiculos": "Veículos",
  "/estoque": "Estoque",
  "/compras": "Compras",
  "/financeiro": "Financeiro",
  "/relatorios": "Relatórios",
  "/crm": "CRM",
  "/equipe": "Equipe",
  "/configuracoes": "Configurações",
};

export function AppHeader() {
  const pathname = usePathname();
  const titulo =
    Object.entries(TITULOS).find(([prefixo]) =>
      pathname.startsWith(prefixo)
    )?.[1] ?? "OficinaPro";

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-semibold">{titulo}</h1>
      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        <ThemeToggle />
      </div>
    </header>
  );
}
