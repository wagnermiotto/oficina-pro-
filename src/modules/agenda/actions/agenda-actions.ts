"use server";

import { revalidatePath } from "next/cache";
import type { StatusAgendamento } from "@prisma/client";
import { requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import {
  agendamentoSchema,
  type AgendamentoFormValues,
} from "../schemas/agenda-schemas";
import * as service from "../services/agenda-service";

export interface ResultadoAgenda {
  ok: boolean;
  erro?: string;
  id?: string;
}

export async function criarAgendamentoAction(
  valores: AgendamentoFormValues
): Promise<ResultadoAgenda> {
  const ctx = await requireOficina();
  const parse = agendamentoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const agendamento = await service.criarAgendamento(
      ctx.db,
      ctx.oficinaId,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "agendamento",
      entidadeId: agendamento.id,
      depois: { titulo: parse.data.titulo, inicio: parse.data.inicio },
    });
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    return { ok: true, id: agendamento.id };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível agendar.",
    };
  }
}

export async function mudarStatusAgendamentoAction(
  id: string,
  novoStatus: StatusAgendamento
): Promise<ResultadoAgenda> {
  const ctx = await requireOficina();
  try {
    await service.mudarStatusAgendamento(ctx.db, id, novoStatus);
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Operação falhou.",
    };
  }
}

export async function excluirAgendamentoAction(id: string): Promise<ResultadoAgenda> {
  const ctx = await requireOficina();
  try {
    await service.excluirAgendamento(ctx.db, id);
    await registrarAuditoria(ctx, {
      acao: "SOFT_DELETE",
      entidade: "agendamento",
      entidadeId: id,
    });
    revalidatePath("/agenda");
    return { ok: true };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Operação falhou.",
    };
  }
}
