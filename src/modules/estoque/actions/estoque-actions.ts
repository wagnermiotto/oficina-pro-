"use server";

import { revalidatePath } from "next/cache";
import { guardPermissao, requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import { paraNumero } from "@/shared/utils/moeda";
import {
  categoriaSchema,
  contagemItensSchema,
  contagemSchema,
  movimentacaoSchema,
  type ContagemFormValues,
  type ContagemItensFormValues,
  type MovimentacaoFormValues,
  type PecaFormValues,
  pecaSchema,
} from "../schemas/estoque-schemas";
import * as service from "../services/estoque-service";
import * as contagemService from "../services/contagem-service";

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
  const negado = await guardPermissao(ctx, "estoque", "CRIAR");
  if (negado) return negado;
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
  const negado = await guardPermissao(ctx, "estoque", "EDITAR");
  if (negado) return negado;
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
  const negado = await guardPermissao(ctx, "estoque", "EXCLUIR");
  if (negado) return negado;
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
  const negado = await guardPermissao(ctx, "estoque", "MOVIMENTAR");
  if (negado) return negado;
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

// --- Contagem cíclica --------------------------------------------------------

export interface ContagemItemDetalhe {
  itemId: string;
  pecaNome: string;
  pecaCodigo: string | null;
  unidade: string;
  saldoSistema: number;
  saldoContado: number | null;
}

export async function carregarContagemAction(
  contagemId: string
): Promise<{ ok: boolean; erro?: string; itens?: ContagemItemDetalhe[] }> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "estoque", "VISUALIZAR");
  if (negado) return negado;
  const contagem = await contagemService.obterContagem(ctx.db, contagemId);
  if (!contagem) return { ok: false, erro: "Contagem não encontrada." };
  return {
    ok: true,
    itens: contagem.itens.map((i) => ({
      itemId: i.id,
      pecaNome: i.peca.nome,
      pecaCodigo: i.peca.codigo,
      unidade: i.peca.unidade,
      saldoSistema: paraNumero(i.saldoSistema),
      saldoContado: i.saldoContado === null ? null : paraNumero(i.saldoContado),
    })),
  };
}

export async function criarContagemAction(
  valores: ContagemFormValues
): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "estoque", "MOVIMENTAR");
  if (negado) return negado;
  const parse = contagemSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const contagem = await contagemService.criarContagem(
      ctx.db,
      ctx.oficinaId,
      ctx.usuario.id,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "contagem_estoque",
      entidadeId: contagem.id,
      depois: parse.data,
    });
    revalidatePath("/estoque");
    return { ok: true, id: contagem.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function salvarContagensAction(
  contagemId: string,
  valores: ContagemItensFormValues
): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "estoque", "MOVIMENTAR");
  if (negado) return negado;
  const parse = contagemItensSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await contagemService.salvarContagens(ctx.db, contagemId, parse.data.itens);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function concluirContagemAction(
  contagemId: string
): Promise<ResultadoEstoque & { ajustes?: number }> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "estoque", "MOVIMENTAR");
  if (negado) return negado;
  try {
    const resultado = await contagemService.concluirContagem(
      ctx.db,
      ctx.oficinaId,
      ctx.usuario.id,
      contagemId
    );
    await registrarAuditoria(ctx, {
      acao: "UPDATE",
      entidade: "contagem_estoque",
      entidadeId: contagemId,
      depois: { status: "CONCLUIDA", ...resultado },
    });
    revalidatePath("/estoque");
    revalidatePath("/dashboard");
    return { ok: true, ajustes: resultado.ajustes };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function cancelarContagemAction(
  contagemId: string
): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "estoque", "MOVIMENTAR");
  if (negado) return negado;
  try {
    await contagemService.cancelarContagem(ctx.db, contagemId);
    await registrarAuditoria(ctx, {
      acao: "UPDATE",
      entidade: "contagem_estoque",
      entidadeId: contagemId,
      depois: { status: "CANCELADA" },
    });
    revalidatePath("/estoque");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function criarCategoriaAction(nome: string): Promise<ResultadoEstoque> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "estoque", "CRIAR");
  if (negado) return negado;
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
