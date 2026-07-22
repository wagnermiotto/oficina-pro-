"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { StatusAgendamento, TipoAgendamento } from "@prisma/client";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  STATUS_AGENDAMENTO_LABEL,
  TIPO_AGENDAMENTO_COR,
  TIPO_AGENDAMENTO_LABEL,
} from "../schemas/agenda-schemas";
import {
  excluirAgendamentoAction,
  mudarStatusAgendamentoAction,
} from "../actions/agenda-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface AgendamentoSemana {
  id: string;
  titulo: string;
  tipo: TipoAgendamento;
  status: StatusAgendamento;
  diaIso: string;
  horario: string;
  cliente: string | null;
  veiculo: string | null;
}

export interface DiaSemana {
  iso: string;
  rotulo: string;
  numero: string;
  hoje: boolean;
}

interface AgendaSemanaProps {
  dias: DiaSemana[];
  agendamentos: AgendamentoSemana[];
  semanaRotulo: string;
  semanaAnterior: string;
  proximaSemana: string;
}

export function AgendaSemana({
  dias,
  agendamentos,
  semanaRotulo,
  semanaAnterior,
  proximaSemana,
}: AgendaSemanaProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navegar(semana: string) {
    const params = new URLSearchParams(searchParams);
    params.set("semana", semana);
    router.replace(`${pathname}?${params.toString()}`);
  }

  async function mudarStatus(id: string, status: StatusAgendamento) {
    const resultado = await mudarStatusAgendamentoAction(id, status);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(`Agendamento ${STATUS_AGENDAMENTO_LABEL[status].toLowerCase()}.`);
    router.refresh();
  }

  async function excluir(id: string) {
    const resultado = await excluirAgendamentoAction(id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success("Agendamento removido.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold capitalize">{semanaRotulo}</p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navegar(semanaAnterior)}
            aria-label="Semana anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navegar("")}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navegar(proximaSemana)}
            aria-label="Próxima semana"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 overflow-x-auto sm:grid-cols-7">
        {dias.map((dia) => {
          const doDia = agendamentos.filter((a) => a.diaIso === dia.iso);
          return (
            <div
              key={dia.iso}
              className={cn(
                "min-h-36 rounded-lg border p-2",
                dia.hoje && "border-destaque/50 bg-destaque/5"
              )}
            >
              <p
                className={cn(
                  "mb-2 text-xs font-semibold",
                  dia.hoje ? "text-destaque" : "text-muted-foreground"
                )}
              >
                {dia.rotulo}{" "}
                <span className="text-sm font-bold text-foreground">
                  {dia.numero}
                </span>
              </p>
              <div className="space-y-1.5">
                {doDia.map((agendamento) => (
                  <DropdownMenu key={agendamento.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-md border-l-4 p-1.5 text-left text-xs transition-opacity hover:opacity-80",
                          TIPO_AGENDAMENTO_COR[agendamento.tipo],
                          (agendamento.status === "CANCELADO" ||
                            agendamento.status === "FALTOU") &&
                            "line-through opacity-50",
                          agendamento.status === "CONCLUIDO" && "opacity-60"
                        )}
                      >
                        <p className="font-mono font-semibold">
                          {agendamento.horario}
                        </p>
                        <p className="truncate font-medium">{agendamento.titulo}</p>
                        <p className="truncate text-muted-foreground">
                          {TIPO_AGENDAMENTO_LABEL[agendamento.tipo]}
                          {agendamento.cliente ? ` · ${agendamento.cliente}` : ""}
                        </p>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(agendamento.status === "AGENDADO" ||
                        agendamento.status === "CONFIRMADO") && (
                        <>
                          {agendamento.status === "AGENDADO" && (
                            <DropdownMenuItem
                              onClick={() => mudarStatus(agendamento.id, "CONFIRMADO")}
                            >
                              <Check className="size-4" /> Confirmar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => mudarStatus(agendamento.id, "CONCLUIDO")}
                          >
                            <CircleCheck className="size-4" /> Concluir
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => mudarStatus(agendamento.id, "FALTOU")}
                          >
                            <UserX className="size-4" /> Não compareceu
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => excluir(agendamento.id)}
                      >
                        <Trash2 className="size-4" /> Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
