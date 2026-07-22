"use server";

import { revalidatePath } from "next/cache";
import { requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import {
  categoriaSchema,
  movimentacaoSchema,
  pecaSchema,
  type MovimentacaoFormValues,
  type PecaFormValues,
} from "../schemas/estoque-schemas";
import * as service from "../services/estoque-service";

export interface ResultadoEstoque {
  ok: boolean;
  erro?: string;
  id?: string;
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Operação falhou.";
}

export async function criarPecaAction(
  valores: PecaFormValues
): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const parse = pecaSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const peca = await service.criarPeca(
      ctx.db,
      ctx.oficinaId,
      ctx.usuario.id,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "peca",
      entidadeId: peca.id,
      depois: parse.data,
    });
    revalidatePath("/estoque");
    return { ok: true, id: peca.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function atualizarPecaAction(
  id: string,
  valores: PecaFormValues
): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const parse = pecaSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const anterior = await ctx.db.peca.findUnique({ where: { id } });
    if (!anterior) return { ok: false, erro: "Peça não encontrada." };
    await service.atualizarPeca(ctx.db, id, parse.data);
    await registrarAuditoria(ctx, {
      acao: "UPDATE",
      entidade: "peca",
      entidadeId: id,
      antes: anterior,
      depois: parse.data,
    });
    revalidatePath("/estoque");
    return { ok: true, id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function excluirPecaAction(id: string): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  try {
    await service.excluirPeca(ctx.db, id);
    await registrarAuditoria(ctx, {
      acao: "SOFT_DELETE",
      entidade: "peca",
      entidadeId: id,
    });
    revalidatePath("/estoque");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function registrarMovimentacaoAction(
  valores: MovimentacaoFormValues
): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const parse = movimentacaoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await service.registrarMovimentacao(
      ctx.db,
      ctx.oficinaId,
      ctx.usuario.id,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "MOVIMENTACAO",
      entidade: "peca",
      entidadeId: parse.data.pecaId,
      depois: parse.data,
    });
    revalidatePath("/estoque");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function criarCategoriaAction(nome: string): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const parse = categoriaSchema.safeParse({ nome });
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Nome inválido." };
  }
  const categoria = await service.criarCategoria(
    ctx.db,
    ctx.oficinaId,
    parse.data.nome
  );
  revalidatePath("/estoque");
  return { ok: true, id: categoria.id };
}
