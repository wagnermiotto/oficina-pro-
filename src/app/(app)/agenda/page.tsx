import type { Metadata } from "next";
import { Suspense } from "react";
import { addDays, format, isValid, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireOficina } from "@/shared/lib/session";
import {
  intervaloSemana,
  listarAgendamentosSemana,
} from "@/modules/agenda/services/agenda-service";
import {
  AgendaSemana,
  type DiaSemana,
} from "@/modules/agenda/components/agenda-semana";
import { AgendamentoDialog } from "@/modules/agenda/components/agendamento-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Agenda" };

interface Props {
  searchParams: Promise<{ semana?: string }>;
}

async function ConteudoAgenda({ searchParams }: Props) {
  const { db } = await requireOficina();
  const params = await searchParams;

  const referencia =
    params.semana && isValid(parseISO(params.semana))
      ? parseISO(params.semana)
      : new Date();
  const { inicio } = intervaloSemana(referencia);
  const hojeIso = format(new Date(), "yyyy-MM-dd");

  const [agendamentos, clientes] = await Promise.all([
    listarAgendamentosSemana(db, referencia),
    db.cliente.findMany({
      orderBy: { nome: "asc" },
      take: 500,
      select: {
        id: true,
        nome: true,
        veiculos: {
          where: { deletedAt: null },
          select: { id: true, placa: true, modelo: true },
        },
      },
    }),
  ]);

  const dias: DiaSemana[] = Array.from({ length: 7 }, (_, i) => {
    const dia = addDays(inicio, i);
    const iso = format(dia, "yyyy-MM-dd");
    return {
      iso,
      rotulo: format(dia, "EEE", { locale: ptBR }),
      numero: format(dia, "dd/MM"),
      hoje: iso === hojeIso,
    };
  });

  const fimSemana = addDays(inicio, 6);
  const semanaRotulo = `${format(inicio, "dd 'de' MMMM", { locale: ptBR })} — ${format(fimSemana, "dd 'de' MMMM yyyy", { locale: ptBR })}`;

  return (
    <>
      <div className="flex justify-end">
        <AgendamentoDialog clientes={clientes} />
      </div>
      <AgendaSemana
        dias={dias}
        agendamentos={agendamentos.map((a) => ({
          id: a.id,
          titulo: a.titulo,
          tipo: a.tipo,
          status: a.status,
          diaIso: format(a.inicio, "yyyy-MM-dd"),
          horario: format(a.inicio, "HH:mm"),
          cliente: a.cliente?.nome ?? null,
          veiculo: a.veiculo ? (a.veiculo.modelo ?? a.veiculo.placa) : null,
        }))}
        semanaRotulo={semanaRotulo}
        semanaAnterior={format(addDays(startOfWeek(referencia, { weekStartsOn: 1 }), -7), "yyyy-MM-dd")}
        proximaSemana={format(addDays(startOfWeek(referencia, { weekStartsOn: 1 }), 7), "yyyy-MM-dd")}
      />
    </>
  );
}

export default function AgendaPage(props: Props) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ConteudoAgenda {...props} />
      </Suspense>
    </div>
  );
}
