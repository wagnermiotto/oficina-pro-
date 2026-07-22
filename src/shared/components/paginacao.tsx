"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginacaoProps {
  pagina: number;
  totalPaginas: number;
  totalRegistros: number;
}

export function Paginacao({ pagina, totalPaginas, totalRegistros }: PaginacaoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function irPara(novaPagina: number) {
    const params = new URLSearchParams(searchParams);
    params.set("pagina", String(novaPagina));
    router.replace(`${pathname}?${params.toString()}`);
  }

  if (totalPaginas <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {totalRegistros} registro{totalRegistros === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Página {pagina} de {totalPaginas} · {totalRegistros} registros
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          disabled={pagina <= 1}
          onClick={() => irPara(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={pagina >= totalPaginas}
          onClick={() => irPara(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
