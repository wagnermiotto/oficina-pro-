"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  respostaAprovacaoSchema,
  type RespostaAprovacaoInput,
} from "../schemas/os-schemas";
import { responderAprovacao } from "../services/aprovacao-service";

export interface ResultadoAprovacaoPublica {
  ok: boolean;
  erro?: string;
  statusAprovacao?: string;
}

/**
 * Action PÚBLICA (sem login): registra a decisão do cliente no orçamento.
 * A segurança vem do token não-adivinhável com expiração e uso único.
 */
export async function responderAprovacaoAction(
  token: string,
  valores: RespostaAprovacaoInput
): Promise<ResultadoAprovacaoPublica> {
  const parse = respostaAprovacaoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    const resultado = await responderAprovacao(token, {
      nome: parse.data.nome,
      decisoes: parse.data.decisoes,
      assinaturaUrl: parse.data.assinatura ?? null,
      ip,
      userAgent: h.get("user-agent"),
    });
    revalidatePath(`/aprovacao/${token}`);
    return { ok: true, statusAprovacao: resultado.statusAprovacao };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível registrar.",
    };
  }
}
