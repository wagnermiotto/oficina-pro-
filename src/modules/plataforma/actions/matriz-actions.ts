"use server";

import { revalidatePath } from "next/cache";
import type { StatusAssinatura } from "@prisma/client";
import { requireSuperAdmin } from "@/shared/lib/session";
import { registrarAuditoriaPlataforma } from "@/shared/lib/audit";
import * as matriz from "../services/matriz-service";

export interface ResultadoMatriz {
  ok: boolean;
  erro?: string;
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Operação falhou.";
}

export async function mudarStatusAssinaturaAction(
  oficinaId: string,
  status: StatusAssinatura
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  try {
    await matriz.mudarStatusAssinatura(oficinaId, status);
    await registrarAuditoriaPlataforma(ctx.usuario.id, oficinaId, {
      acao: "MATRIZ_STATUS",
      entidade: "assinatura",
      entidadeId: oficinaId,
      depois: { status },
    });
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function criarAssinaturaAction(
  oficinaId: string,
  planoId: string
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  try {
    await matriz.criarAssinatura(oficinaId, planoId);
    await registrarAuditoriaPlataforma(ctx.usuario.id, oficinaId, {
      acao: "MATRIZ_ASSINATURA_CRIADA",
      entidade: "assinatura",
      entidadeId: oficinaId,
      depois: { planoId },
    });
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function renovarAssinaturaAction(
  oficinaId: string
): Promise<ResultadoMatriz> {
  await requireSuperAdmin();
  try {
    await matriz.renovarAssinatura(oficinaId);
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function definirVencimentoAction(
  oficinaId: string,
  vencimento: string
): Promise<ResultadoMatriz> {
  await requireSuperAdmin();
  const data = new Date(vencimento);
  if (Number.isNaN(data.getTime())) {
    return { ok: false, erro: "Data de vencimento inválida." };
  }
  try {
    await matriz.definirVencimento(oficinaId, data);
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function trocarPlanoAction(
  oficinaId: string,
  planoId: string
): Promise<ResultadoMatriz> {
  await requireSuperAdmin();
  try {
    await matriz.trocarPlano(oficinaId, planoId);
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}
