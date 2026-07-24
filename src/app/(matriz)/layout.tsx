import Link from "next/link";
import { Building2, LayoutDashboard, ShieldCheck, Layers } from "lucide-react";
import { requireSuperAdmin } from "@/shared/lib/session";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";

const NAV = [
  { href: "/matriz", label: "Visão geral", icone: LayoutDashboard },
  { href: "/matriz/oficinas", label: "Oficinas", icone: Building2 },
  { href: "/matriz/planos", label: "Planos", icone: Layers },
];

export default async function MatrizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSuperAdmin();

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">Matriz</p>
              <p className="text-[10px] text-muted-foreground">OficinaPro · plataforma</p>
            </div>
          </div>
          <nav className="ml-4 flex items-center gap-1">
            {NAV.map(({ href, label, icone: Icone }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icone className="size-4" /> {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {ctx.usuario.email}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
