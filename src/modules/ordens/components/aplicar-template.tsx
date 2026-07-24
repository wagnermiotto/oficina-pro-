"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { aplicarTemplateOSAction } from "../actions/os-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AplicarTemplate({
  osId,
  templates,
}: {
  osId: string;
  templates: { id: string; nome: string; itens: number }[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aplicando, setAplicando] = useState<string | null>(null);

  if (templates.length === 0) return null;

  function aplicar(templateId: string) {
    setAplicando(templateId);
    iniciar(async () => {
      const r = await aplicarTemplateOSAction(osId, templateId);
      setAplicando(null);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Itens do pacote adicionados à OS.");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pendente}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
          Aplicar pacote
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Pacotes de serviço</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map((t) => (
          <DropdownMenuItem
            key={t.id}
            disabled={aplicando !== null}
            onSelect={(e) => {
              e.preventDefault();
              aplicar(t.id);
            }}
          >
            <span className="flex-1">{t.nome}</span>
            <span className="text-xs text-muted-foreground">{t.itens} item(s)</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
