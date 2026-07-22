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
    itens: [{ titulo: "Dashboard", href: "/dashboard", icone: LayoutDashboard }],
  },
  {
    titulo: "Operação",
    itens: [
      { titulo: "Ordens de Serviço", href: "/ordens", icone: Wrench },
      { titulo: "Agenda", href: "/agenda", icone: Calendar },
      { titulo: "Clientes", href: "/clientes", icone: Users },
      { titulo: "Veículos", href: "/veiculos", icone: Car },
    ],
  },
  {
    titulo: "Suprimentos",
    itens: [
      { titulo: "Estoque", href: "/estoque", icone: Package },
      { titulo: "Compras", href: "/compras", icone: ShoppingCart },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { titulo: "Financeiro", href: "/financeiro", icone: Wallet },
      { titulo: "Relatórios", href: "/relatorios", icone: BarChart3 },
      { titulo: "CRM", href: "/crm", icone: HeartHandshake },
      { titulo: "Equipe", href: "/equipe", icone: UserCog },
    ],
  },
];

interface AppSidebarProps {
  nomeOficina: string;
  usuario: { nome: string; email: string };
}

export function AppSidebar({ nomeOficina, usuario }: AppSidebarProps) {
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
        {GRUPOS_NAV.map((grupo) => (
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
