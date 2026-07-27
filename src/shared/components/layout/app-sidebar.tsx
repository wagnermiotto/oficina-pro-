"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Car,
  ChevronsUpDown,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { authClient } from "@/shared/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const GRUPOS_NAV = [
  {
    titulo: "Visão geral",
    itens: [
      { titulo: "Dashboard", href: "/dashboard", icone: LayoutDashboard, modulo: "dashboard" },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { titulo: "Ordens de Serviço", href: "/ordens", icone: Wrench, modulo: "ordens" },
      { titulo: "Agenda", href: "/agenda", icone: Calendar, modulo: "agenda" },
      { titulo: "Clientes", href: "/clientes", icone: Users, modulo: "clientes" },
      { titulo: "Veículos", href: "/veiculos", icone: Car, modulo: "veiculos" },
    ],
  },
  {
    titulo: "Suprimentos",
    itens: [
      { titulo: "Estoque", href: "/estoque", icone: Package, modulo: "estoque" },
      { titulo: "Compras", href: "/compras", icone: ShoppingCart, modulo: "compras" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { titulo: "Financeiro", href: "/financeiro", icone: Wallet, modulo: "financeiro" },
      { titulo: "Relatórios", href: "/relatorios", icone: BarChart3, modulo: "relatorios" },
      { titulo: "CRM", href: "/crm", icone: HeartHandshake, modulo: "crm" },
      { titulo: "Equipe", href: "/equipe", icone: UserCog, modulo: "equipe" },
    ],
  },
];

interface AppSidebarProps {
  nomeOficina: string;
  usuario: { nome: string; email: string };
  /** Módulos com VISUALIZAR no perfil do usuário (RBAC). Filtra o menu — UX;
   * a segurança real está nos gates de página e nas Server Actions. */
  modulosVisiveis: string[];
}

export function AppSidebar({ nomeOficina, usuario, modulosVisiveis }: AppSidebarProps) {
  const visiveis = new Set(modulosVisiveis);
  const grupos = GRUPOS_NAV.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter((item) => visiveis.has(item.modulo)),
  })).filter((grupo) => grupo.itens.length > 0);
  const pathname = usePathname();
  const router = useRouter();

  const iniciais = usuario.nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function sair() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-destaque text-destaque-foreground">
                  <Wrench className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">OficinaPro</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {nomeOficina}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.titulo}>
            <SidebarGroupLabel>{grupo.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.titulo}
                    >
                      <Link href={item.href}>
                        <item.icone />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {visiveis.has("configuracoes") ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/configuracoes")}
                tooltip="Configurações"
              >
                <Link href="/configuracoes">
                  <Settings />
                  <span>Configurações</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                      {iniciais}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{usuario.nome}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {usuario.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {usuario.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={sair} variant="destructive">
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
