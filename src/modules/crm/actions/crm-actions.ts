"use server";

import { revalidatePath } from "next/cache";
import { requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import {
  interacaoSchema,
  type InteracaoFormValues,
} from "../schemas/crm-schemas";
import * as service from "../services/crm-service";

export interface ResultadoCRM {
  ok: boolean;
  erro?: string;
  id?: string;
}

export async function criarInteracaoAction(
  valores: InteracaoFormValues
): Promise<ResultadoCRM> {
  const ctx = await requireOficina();
  const parse = interacaoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const interacao = await service.criarInteracao(
      ctx.db,
      ctx.oficinaId,
      ctx.usuario.id,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "interacao",
      entidadeId: interacao.id,
      depois: { clienteId: parse.data.clienteId, tipo: parse.data.tipo },
    });
    revalidatePath("/crm");
    return { ok: true, id: interacao.id };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Operação falhou.",
    };
  }
}

export async function concluirLembreteAction(id: string): Promise<ResultadoCRM> {
  const ctx = await requireOficina();
  try {
    await service.concluirLembrete(ctx.db, id);
    revalidatePath("/crm");
    return { ok: true };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Operação falhou.",
    };
  }
}
