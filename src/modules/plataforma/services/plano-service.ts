import "server-only";
import { cache } from "react";
import { prisma } from "@/shared/lib/prisma";

export type ChaveRecurso =
  | "max_users"
  | "max_branches"
  | "max_storage_gb"
  | "ia_enabled"
  | "bi_enabled";

/** Recursos do plano ativo de uma oficina (cacheado por request). */
const recursosCache = cache(async (oficinaId: string) => {
  const assinatura = await prisma.assinatura.findUnique({
    where: { oficinaId },
    select: { plano: { select: { recursos: true } } },
  });
  const mapa = new Map<string, string>();
  for (const r of assinatura?.plano.recursos ?? []) mapa.set(r.chave, r.valor);
  return mapa;
});

/**
 * O plano da oficina permite este recurso? Booleanos ("ia_enabled") viram
 * true/false; numéricos ("max_users") retornam true se o limite for > 0.
 * Sem assinatura → liberado (oficina legada), para não quebrar o que já roda.
 */
export async function planoPermite(
  oficinaId: string,
  chave: ChaveRecurso
): Promise<boolean> {
  const recursos = await recursosCache(oficinaId);
  if (recursos.size === 0) return true;
  const valor = recursos.get(chave);
  if (valor === undefined) return true;
  if (valor === "true") return true;
  if (valor === "false") return false;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero > 0 : true;
}

/** Limite numérico de um recurso (ex.: max_users). null = sem limite. */
export async function limitePlano(
  oficinaId: string,
  chave: ChaveRecurso
): Promise<number | null> {
  const recursos = await recursosCache(oficinaId);
  const valor = recursos.get(chave);
  if (valor === undefined) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}
