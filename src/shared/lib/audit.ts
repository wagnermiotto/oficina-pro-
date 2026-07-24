import "server-only";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { ContextoOficina } from "./session";

interface DadosAuditoria {
  acao: string;
  entidade: string;
  entidadeId?: string;
  antes?: unknown;
  depois?: unknown;
}

/**
 * Auditoria de ações da Matriz (Super Admin). Registra a oficina alvo e o
 * usuário admin. Nunca lança.
 */
export async function registrarAuditoriaPlataforma(
  usuarioId: string,
  oficinaId: string | null,
  dados: DadosAuditoria
): Promise<void> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    await prisma.auditLog.create({
      data: {
        oficinaId,
        usuarioId,
        acao: dados.acao,
        entidade: dados.entidade,
        entidadeId: dados.entidadeId ?? null,
        ip,
        userAgent: h.get("user-agent"),
        depois:
          dados.depois === undefined
            ? Prisma.JsonNull
            : (JSON.parse(JSON.stringify(dados.depois)) as Prisma.InputJsonValue),
      },
    });
  } catch (erro) {
    console.error("Falha ao registrar auditoria da plataforma:", erro);
  }
}

/**
 * Registra trilha de auditoria da oficina (quem, quando, IP, antes/depois).
 * Nunca lança: falha de auditoria não pode derrubar a operação de negócio.
 */
export async function registrarAuditoria(
  ctx: ContextoOficina,
  dados: DadosAuditoria
): Promise<void> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    await ctx.db.auditLog.create({
      data: {
        oficinaId: ctx.oficinaId,
        usuarioId: ctx.usuario.id,
        acao: dados.acao,
        entidade: dados.entidade,
        entidadeId: dados.entidadeId ?? null,
        ip,
        userAgent: h.get("user-agent"),
        antes: dados.antes === undefined
          ? Prisma.JsonNull
          : (JSON.parse(JSON.stringify(dados.antes)) as Prisma.InputJsonValue),
        depois: dados.depois === undefined
          ? Prisma.JsonNull
          : (JSON.parse(JSON.stringify(dados.depois)) as Prisma.InputJsonValue),
      },
    });
  } catch (erro) {
    console.error("Falha ao registrar auditoria:", erro);
  }
}
