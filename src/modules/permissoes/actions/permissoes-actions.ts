"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardPermissao, requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import { permissaoValida } from "@/shared/permissoes/catalogo";
import * as service from "../services/permissoes-service";

export interface ResultadoPermissoes {
  ok: boolean;
  erro?: string;
  id?: string;
}

const permissaoSchema = z
  .object({ modulo: z.string().min(1), acao: z.string().min(1) })
  .refine((p) => permissaoValida(p.modulo, p.acao), {
    message: "Permissão desconhecida.",
  });

const perfilSchema = z.object({
  nome: z.string().min(2, "Informe o nome do perfil.").max(60),
  descricao: z.string().max(200).optional(),
  permissoes: z.array(permissaoSchema),
});
export type PerfilAcessoFormValues = z.input<typeof perfilSchema>;

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Operação falhou.";
}

export async function criarPerfilAction(
  valores: PerfilAcessoFormValues
): Promise<ResultadoPermissoes> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "permissoes", "EDITAR");
  if (negado) return negado;
  const parse = perfilSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const perfil = await service.criarPerfil(ctx.db, ctx.oficinaId, parse.data);
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "perfil_acesso",
      entidadeId: perfil.id,
      depois: {
        nome: parse.data.nome,
        permissoes: parse.data.permissoes.map((p) => `${p.modulo}.${p.acao}`),
      },
    });
    revalidatePath("/configuracoes");
    return { ok: true, id: perfil.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function duplicarPerfilAction(
  origemId: string,
  novoNome: string
): Promise<ResultadoPermissoes> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "permissoes", "EDITAR");
  if (negado) return negado;
  if (!novoNome || novoNome.trim().length < 2) {
    return { ok: false, erro: "Informe o nome do novo perfil." };
  }
  try {
    const perfil = await service.duplicarPerfil(
      ctx.db,
      ctx.oficinaId,
      origemId,
      novoNome
    );
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "perfil_acesso",
      entidadeId: perfil.id,
      depois: { nome: perfil.nome, duplicadoDe: origemId },
    });
    revalidatePath("/configuracoes");
    return { ok: true, id: perfil.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function renomearPerfilAction(
  perfilId: string,
  nome: string,
  descricao?: string
): Promise<ResultadoPermissoes> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "permissoes", "EDITAR");
  if (negado) return negado;
  try {
    const antes = await ctx.db.perfilAcesso.findFirst({
      where: { id: perfilId },
      select: { nome: true, descricao: true },
    });
    await service.renomearPerfil(ctx.db, perfilId, nome, descricao);
    await registrarAuditoria(ctx, {
      acao: "UPDATE",
      entidade: "perfil_acesso",
      entidadeId: perfilId,
      antes,
      depois: { nome: nome.trim(), descricao: descricao?.trim() || null },
    });
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function excluirPerfilAction(
  perfilId: string
): Promise<ResultadoPermissoes> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "permissoes", "EDITAR");
  if (negado) return negado;
  try {
    const antes = await ctx.db.perfilAcesso.findFirst({
      where: { id: perfilId },
      select: { nome: true, permissoes: { select: { modulo: true, acao: true } } },
    });
    const perfil = await service.excluirPerfil(ctx.db, perfilId);
    await registrarAuditoria(ctx, {
      acao: "DELETE",
      entidade: "perfil_acesso",
      entidadeId: perfilId,
      antes: antes
        ? {
            nome: antes.nome,
            permissoes: antes.permissoes.map((p) => `${p.modulo}.${p.acao}`),
          }
        : undefined,
    });
    revalidatePath("/configuracoes");
    return { ok: true, id: perfil.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function salvarMatrizPerfilAction(
  perfilId: string,
  permissoes: { modulo: string; acao: string }[]
): Promise<ResultadoPermissoes> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "permissoes", "EDITAR");
  if (negado) return negado;
  const parse = z.array(permissaoSchema).safeParse(permissoes);
  if (!parse.success) {
    return { ok: false, erro: "Há permissões inválidas na matriz." };
  }
  try {
    // Regra do último editor: se a nova matriz REMOVE permissoes.EDITAR de um
    // perfil em uso, garantir que sobra outro editor na oficina.
    const mantemEditar = parse.data.some(
      (p) => p.modulo === "permissoes" && p.acao === "EDITAR"
    );
    if (!mantemEditar) {
      const emUso = await ctx.db.funcionarioPerfil.count({
        where: { perfilAcessoId: perfilId, ativo: true, deletedAt: null },
      });
      if (emUso > 0) {
        const outroEditor = await service.existeOutroEditorDePermissoes(ctx.db, {
          perfilId,
        });
        if (!outroEditor) {
          return {
            ok: false,
            erro: "A oficina ficaria sem ninguém para gerenciar permissões.",
          };
        }
      }
    }
    const { antes, depois } = await service.substituirMatriz(
      ctx.db,
      ctx.oficinaId,
      perfilId,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "UPDATE",
      entidade: "permissao_perfil",
      entidadeId: perfilId,
      antes: { permissoes: antes },
      depois: { permissoes: depois },
    });
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}
