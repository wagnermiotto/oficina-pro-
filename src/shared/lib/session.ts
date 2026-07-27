import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { tenantDb, type TenantDb } from "./tenant-db";
import { normalizarChaves } from "@/modules/permissoes/services/permissoes-service";
import { chave, type ChavePermissao, type Modulo } from "@/shared/permissoes/catalogo";

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

// =============================================================================
// RBAC dinâmico (PerfilAcesso × PermissaoPerfil)
// =============================================================================

export interface PermissoesUsuario {
  perfilId: string | null;
  perfilNome: string | null;
  /** Chave do seed ("PROPRIETARIO", "MECANICO"...) ou null p/ perfil custom. */
  perfilChave: string | null;
  /** Chaves normalizadas "modulo.ACAO" (VISUALIZAR_TODAS ⇒ +VISUALIZAR). */
  chaves: ReadonlySet<ChavePermissao>;
}

const SEM_PERMISSOES: PermissoesUsuario = {
  perfilId: null,
  perfilNome: null,
  perfilChave: null,
  chaves: new Set(),
};

/**
 * 1 query por request (React cache): funcionário ativo → perfil ativo →
 * matriz. Fallback = negar tudo (sem perfil, inativo ou soft-deletado).
 */
const permissoesCache = cache(
  async (oficinaId: string, userId: string): Promise<PermissoesUsuario> => {
    const funcionario = await prisma.funcionarioPerfil.findFirst({
      where: { oficinaId, userId, deletedAt: null, ativo: true },
      select: {
        perfilAcesso: {
          select: {
            id: true,
            nome: true,
            chave: true,
            ativo: true,
            deletedAt: true,
            permissoes: { select: { modulo: true, acao: true } },
          },
        },
      },
    });
    const perfil = funcionario?.perfilAcesso;
    if (!perfil || !perfil.ativo || perfil.deletedAt) return SEM_PERMISSOES;
    return {
      perfilId: perfil.id,
      perfilNome: perfil.nome,
      perfilChave: perfil.chave,
      chaves: normalizarChaves(perfil.permissoes),
    };
  }
);

/** Permissões do usuário na oficina ativa (cacheado por request). */
export async function getPermissoes(ctx: ContextoOficina): Promise<PermissoesUsuario> {
  return permissoesCache(ctx.oficinaId, ctx.usuario.id);
}

/**
 * O usuário pode (modulo, acao)? Super Admin da plataforma bypassa — checado
 * apenas no caminho de falha (escape hatch anti-lockout, consistente com o
 * bypass de assinatura).
 */
export async function temPermissao(
  ctx: ContextoOficina,
  modulo: Modulo,
  acao: string
): Promise<boolean> {
  return temPermissaoDireta(ctx.oficinaId, ctx.usuario.id, modulo, acao);
}

/** Variante sem ContextoOficina — para route handlers (PDF, exportações). */
export async function temPermissaoDireta(
  oficinaId: string,
  userId: string,
  modulo: Modulo,
  acao: string
): Promise<boolean> {
  const permissoes = await permissoesCache(oficinaId, userId);
  if (permissoes.chaves.has(chave(modulo, acao))) return true;
  return superAdminCache(userId);
}

export class PermissaoNegadaError extends Error {
  constructor(modulo: string, acoes: string[]) {
    super(
      `Permissão negada: exige ${acoes.map((a) => `${modulo}.${a}`).join(" e ")}.`
    );
    this.name = "PermissaoNegadaError";
  }
}

/** Exige TODAS as ações informadas no módulo; lança PermissaoNegadaError. */
export async function requirePermissao(
  ctx: ContextoOficina,
  modulo: Modulo,
  ...acoes: string[]
): Promise<void> {
  for (const acao of acoes) {
    if (!(await temPermissao(ctx, modulo, acao))) {
      throw new PermissaoNegadaError(modulo, acoes);
    }
  }
}

/**
 * Guard para Server Actions: retorna o DTO de erro padrão ({ok:false}) em vez
 * de lançar, ou null quando autorizado. Uso:
 *   const negado = await guardPermissao(ctx, "financeiro", "CRIAR");
 *   if (negado) return negado;
 */
export async function guardPermissao(
  ctx: ContextoOficina,
  modulo: Modulo,
  ...acoes: string[]
): Promise<{ ok: false; erro: string } | null> {
  for (const acao of acoes) {
    if (!(await temPermissao(ctx, modulo, acao))) {
      return {
        ok: false,
        erro: "Você não tem permissão para esta ação. Fale com o responsável pela oficina.",
      };
    }
  }
  return null;
}

/** Gate de página: sem a permissão → redirect p/ /acesso-restrito. */
export async function requirePermissaoPage(
  ctx: ContextoOficina,
  modulo: Modulo,
  acao: string = "VISUALIZAR"
): Promise<void> {
  if (!(await temPermissao(ctx, modulo, acao))) redirect("/acesso-restrito");
}

/**
 * Escopo de OS do usuário: "TODAS" (vê tudo), "PROPRIAS" (só as atribuídas a
 * ele — perfil Mecânico padrão) ou null (sem acesso a ordens).
 */
export async function escopoOrdens(
  ctx: ContextoOficina
): Promise<"TODAS" | "PROPRIAS" | null> {
  if (await temPermissao(ctx, "ordens", "VISUALIZAR_TODAS")) return "TODAS";
  if (await temPermissao(ctx, "ordens", "VISUALIZAR")) return "PROPRIAS";
  return null;
}
