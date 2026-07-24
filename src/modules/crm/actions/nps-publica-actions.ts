"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { responderNps } from "../services/nps-service";

export interface ResultadoNpsPublica {
  ok: boolean;
  erro?: string;
}

/**
 * Action PÚBLICA (sem login): registra a nota da pesquisa de satisfação.
 * Segurança pelo token não-adivinhável de uso único.
 */
export async function responderNpsAction(
  token: string,
  valores: { nota: number; comentario?: string }
): Promise<ResultadoNpsPublica> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    await responderNps(token, {
      nota: valores.nota,
      comentario: valores.comentario ?? null,
      ip,
    });
    revalidatePath(`/nps/${token}`);
    return { ok: true };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível registrar.",
    };
  }
}
