"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Campo de busca que sincroniza com ?busca= na URL (debounce de 350 ms). */
export function BuscaInput({ placeholder = "Buscar..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(searchParams.get("busca") ?? "");

  useEffect(() => {
    const atual = searchParams.get("busca") ?? "";
    if (valor === atual) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (valor) {
        params.set("busca", valor);
      } else {
        params.delete("busca");
      }
      params.delete("pagina");
      router.replace(`${pathname}?${params.toString()}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [valor, pathname, router, searchParams]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
