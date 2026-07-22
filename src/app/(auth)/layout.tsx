import { Wrench } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-b from-background to-muted/60 p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-destaque text-destaque-foreground shadow-lg">
          <Wrench className="size-6" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight">OficinaPro</p>
          <p className="text-xs text-muted-foreground">
            Gestão completa para oficinas
          </p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
