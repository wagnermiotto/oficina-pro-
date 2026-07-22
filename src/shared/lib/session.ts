import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Cargo } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { tenantDb, type TenantDb } from "./tenant-db";

/** Sessão atual (cacheada por request). Null se não autenticado. */
export const getSessao = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Exige usuário autenticado; redireciona para /login caso contrário. */
export async function requireSessao() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  return sessao;
}

export interface ContextoOficina {
  sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>;
  oficinaId: string;
  db: TenantDb;
  usuario: { id: string; nome: string; email: string };
}

/**
 * Exige usuário autenticado COM oficina ativa; redireciona para /onboarding
 * se ainda não houver oficina. Retorna o client Prisma já escopado ao tenant.
 */
export async function requireOficina(): Promise<ContextoOficina> {
  const sessao = await requireSessao();
  const oficinaId = sessao.session.activeOrganizationId;
  if (!oficinaId) redirect("/onboarding");
  return {
    sessao,
    oficinaId,
    db: tenantDb(oficinaId),
    usuario: {
      id: sessao.user.id,
      nome: sessao.user.name,
      email: sessao.user.email,
    },
  };
}

const cargoCache = cache(async (oficinaId: string, userId: string) => {
  return prisma.funcionarioPerfil.findFirst({
    where: { oficinaId, userId, deletedAt: null, ativo: true },
    select: { cargo: true },
  });
});

/** Cargo do usuário na oficina ativa (RBAC de domínio). */
export async function getCargo(ctx: ContextoOficina): Promise<Cargo | null> {
  const perfil = await cargoCache(ctx.oficinaId, ctx.usuario.id);
  return perfil?.cargo ?? null;
}

export class PermissaoNegadaError extends Error {
  constructor(cargosNecessarios: Cargo[]) {
    super(`Permissão negada. Exige cargo: ${cargosNecessarios.join(" ou ")}.`);
    this.name = "PermissaoNegadaError";
  }
}

/** Exige que o usuário tenha um dos cargos informados na oficina ativa. */
export async function requireCargo(
  ctx: ContextoOficina,
  ...cargos: Cargo[]
): Promise<Cargo> {
  const cargo = await getCargo(ctx);
  if (!cargo || (cargos.length > 0 && !cargos.includes(cargo))) {
    throw new PermissaoNegadaError(cargos);
  }
  return cargo;
}
