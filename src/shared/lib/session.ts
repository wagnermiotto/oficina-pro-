import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
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

const assinaturaCache = cache(async (oficinaId: string) => {
  return prisma.assinatura.findUnique({
    where: { oficinaId },
    select: { id: true, status: true, vencimento: true, diasBloqueio: true },
  });
});

const superAdminCache = cache(async (userId: string) => {
  const admin = await prisma.plataformaAdmin.findUnique({ where: { userId } });
  return Boolean(admin);
});

/** O usuário é Super Admin da plataforma (Matriz)? */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return superAdminCache(userId);
}

/**
 * Aplica o status da assinatura da oficina (cobrança manual da Matriz):
 * - Sem assinatura cadastrada → acesso liberado (oficina legada/cortesia).
 * - Vencida além do prazo de bloqueio → vira BLOQUEADO (transição preguiçosa,
 *   persistida na primeira leitura — sem depender de cron).
 * - BLOQUEADO/SUSPENSO/CANCELADO → redireciona para /assinatura-bloqueada
 *   (Super Admin nunca é bloqueado).
 */
async function aplicarBloqueioAssinatura(oficinaId: string, userId: string) {
  const assinatura = await assinaturaCache(oficinaId);
  if (!assinatura) return;

  let status = assinatura.status;
  if (status === "ATIVO" || status === "PENDENTE" || status === "ATRASADO") {
    const agora = new Date();
    const limiteBloqueio = new Date(assinatura.vencimento);
    limiteBloqueio.setDate(limiteBloqueio.getDate() + assinatura.diasBloqueio);
    const novoStatus =
      limiteBloqueio < agora
        ? "BLOQUEADO"
        : assinatura.vencimento < agora
          ? "ATRASADO"
          : status;
    if (novoStatus !== status) {
      status = novoStatus;
      await prisma.assinatura.update({
        where: { id: assinatura.id },
        data: { status: novoStatus },
      });
    }
  }

  if (status === "BLOQUEADO" || status === "SUSPENSO" || status === "CANCELADO") {
    if (await superAdminCache(userId)) return;
    redirect("/assinatura-bloqueada");
  }
}

/**
 * Exige usuário autenticado COM oficina ativa; redireciona para /onboarding
 * se ainda não houver oficina. Retorna o client Prisma já escopado ao tenant.
 */
export async function requireOficina(): Promise<ContextoOficina> {
  const sessao = await requireSessao();
  const oficinaId = sessao.session.activeOrganizationId;
  if (!oficinaId) redirect("/onboarding");
  await aplicarBloqueioAssinatura(oficinaId, sessao.user.id);
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

export interface ContextoMatriz {
  sessao: NonNullable<Awaited<ReturnType<typeof getSessao>>>;
  usuario: { id: string; nome: string; email: string };
}

/**
 * Exige Super Admin da plataforma (allowlist PlataformaAdmin). Para quem não
 * é, a Matriz simplesmente não existe (404) — sem vazar a rota.
 */
export async function requireSuperAdmin(): Promise<ContextoMatriz> {
  const sessao = await requireSessao();
  if (!(await superAdminCache(sessao.user.id))) notFound();
  return {
    sessao,
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
