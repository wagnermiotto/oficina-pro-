import "server-only";
import { addDays, endOfDay, startOfDay, startOfWeek } from "date-fns";
import type { StatusAgendamento } from "@prisma/client";
import type { TenantDb } from "@/shared/lib/tenant-db";
import type { AgendamentoInput } from "../schemas/agenda-schemas";

/** Semana (segunda a domingo) que contém a data de referência. */
export function intervaloSemana(referencia: Date) {
  const inicio = startOfWeek(referencia, { weekStartsOn: 1 });
  return { inicio, fim: endOfDay(addDays(inicio, 6)) };
}

export async function listarAgendamentosSemana(db: TenantDb, referencia: Date) {
  const { inicio, fim } = intervaloSemana(referencia);
  return db.agendamento.findMany({
    where: { inicio: { gte: inicio, lte: fim } },
    orderBy: { inicio: "asc" },
    include: {
      cliente: { select: { id: true, nome: true } },
      veiculo: { select: { id: true, placa: true, modelo: true } },
    },
  });
}

export async function criarAgendamento(
  db: TenantDb,
  oficinaId: string,
  dados: AgendamentoInput
) {
  return db.agendamento.create({
    data: {
      oficinaId,
      titulo: dados.titulo,
      tipo: dados.tipo,
      clienteId: dados.clienteId ?? null,
      veiculoId: dados.veiculoId ?? null,
      inicio: dados.inicio,
      fim: dados.fim ?? null,
      observacoes: dados.observacoes ?? null,
    },
  });
}

const TRANSICOES_AGENDAMENTO: Record<StatusAgendamento, StatusAgendamento[]> = {
  AGENDADO: ["CONFIRMADO", "CONCLUIDO", "CANCELADO", "FALTOU"],
  CONFIRMADO: ["CONCLUIDO", "CANCELADO", "FALTOU"],
  CONCLUIDO: [],
  CANCELADO: [],
  FALTOU: [],
};

export async function mudarStatusAgendamento(
  db: TenantDb,
  id: string,
  novoStatus: StatusAgendamento
) {
  const agendamento = await db.agendamento.findUnique({ where: { id } });
  if (!agendamento) throw new Error("Agendamento não encontrado.");
  if (!TRANSICOES_AGENDAMENTO[agendamento.status].includes(novoStatus)) {
    throw new Error("Mudança de status inválida para este agendamento.");
  }
  return db.agendamento.update({ where: { id }, data: { status: novoStatus } });
}

export async function excluirAgendamento(db: TenantDb, id: string) {
  return db.agendamento.update({
    where: { id },
    data: { deletedAt: new Date(), status: "CANCELADO" },
  });
}

export { startOfDay };
