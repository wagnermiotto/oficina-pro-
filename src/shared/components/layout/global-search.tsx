"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, FileText, Search, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { buscaGlobal, type ResultadoBusca } from "@/shared/actions/busca-global-actions";

const ICONE = {
  ordem: FileText,
  cliente: User,
  veiculo: Car,
} as const;

const GRUPO_LABEL = {
  ordem: "Ordens de serviço",
  cliente: "Clientes",
  veiculo: "Veículos",
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [carregando, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atalho global Ctrl+K / ⌘K.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAberto((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }
    debounce.current = setTimeout(() => {
      startTransition(async () => {
        const r = await buscaGlobal(termo);
        setResultados(r);
      });
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [termo]);

  const irPara = useCallback(
    (href: string) => {
      setAberto(false);
      setTermo("");
      setResultados([]);
      router.push(href);
    },
    [router]
  );

  const grupos = (["ordem", "cliente", "veiculo"] as const)
    .map((tipo) => ({ tipo, itens: resultados.filter((r) => r.tipo === tipo) }))
    .filter((g) => g.itens.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={aberto}
        onOpenChange={setAberto}
        title="Busca global"
        description="Encontre clientes, veículos e ordens de serviço"
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Buscar por nome, placa, CPF, telefone ou nº da OS..."
          value={termo}
          onValueChange={setTermo}
        />
        <CommandList>
          {termo.trim().length < 2 ? (
            <CommandEmpty>Digite ao menos 2 caracteres para buscar.</CommandEmpty>
          ) : carregando ? (
            <CommandEmpty>Buscando...</CommandEmpty>
          ) : grupos.length === 0 ? (
            <CommandEmpty>Nada encontrado para “{termo}”.</CommandEmpty>
          ) : (
            grupos.map((grupo) => (
              <CommandGroup key={grupo.tipo} heading={GRUPO_LABEL[grupo.tipo]}>
                {grupo.itens.map((item) => {
                  const Icone = ICONE[item.tipo];
                  return (
                    <CommandItem
                      key={`${item.tipo}-${item.id}`}
                      value={`${item.tipo}-${item.id}`}
                      onSelect={() => irPara(item.href)}
                    >
                      <Icone className="size-4" />
                      <div className="flex flex-col">
                        <span>{item.titulo}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.subtitulo}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
