"use server";

import { revalidatePath } from "next/cache";
import type { StatusOS } from "@prisma/client";
import {
  escopoOrdens,
  guardPermissao,
  requireOficina,
  type ContextoOficina,
} from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import {
  ajusteOSSchema,
  itemDiagnosticoSchema,
  itemPecaSchema,
  itemServicoSchema,
  novaOSSchema,
  type AjusteOSFormValues,
  type ItemDiagnosticoFormValues,
  type ItemPecaFormValues,
  type ItemServicoFormValues,
  type NovaOSFormValues,
} from "../schemas/os-schemas";
import * as osService from "../services/os-service";
import { criarAprovacao } from "../services/aprovacao-service";
import {
  atualizarItemChecklist,
  criarChecklist,
} from "../services/checklist-service";
import { aplicarTemplateNaOS } from "../services/template-service";
import { gerarPortalToken } from "../services/portal-service";
import { paraNumero } from "@/shared/utils/moeda";
import type { StatusChecklist } from "@prisma/client";

export interface ResultadoOS {
  ok: boolean;
  erro?: string;
  id?: string;
  url?: string;
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Operação falhou.";
}

/**
 * Escopo "minhas OS": quem só tem ordens.VISUALIZAR (sem VISUALIZAR_TODAS)
 * opera apenas nas OS atribuídas a ele (mecanicoId).
 */
async function guardEscopoOS(
  ctx: ContextoOficina,
  osId: string
): Promise<{ ok: false; erro: string } | null> {
  const escopo = await escopoOrdens(ctx);
  if (escopo === "TODAS") return null;
  if (escopo === "PROPRIAS") {
    const os = await ctx.db.ordemServico.findUnique({
      where: { id: osId },
      select: { mecanicoId: true },
    });
    if (os && os.mecanicoId === ctx.usuario.id) return null;
    return { ok: false, erro: "Esta OS não está atribuída a você." };
  }
  return { ok: false, erro: "Você não tem acesso às ordens de serviço." };
}

export async function criarOSAction(
  valores: NovaOSFormValues
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "ordens", "CRIAR");
  if (negado) return negado;
  const parse = novaOSSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const os = await osService.criarOS(
      ctx.db,
      ctx.oficinaId,
      ctx.usuario.id,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "ordem_servico",
      entidadeId: os.id,
      depois: { numero: os.numero, ...parse.data },
    });
    revalidatePath("/ordens");
    return { ok: true, id: os.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function mudarStatusOSAction(
  osId: string,
  novoStatus: StatusOS,
  observacao?: string
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "MUDAR_STATUS")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  try {
    await osService.mudarStatus(
      ctx.db,
      ctx.oficinaId,
      osId,
      novoStatus,
      ctx.usuario.id,
      observacao
    );
    await registrarAuditoria(ctx, {
      acao: "STATUS",
      entidade: "ordem_servico",
      entidadeId: osId,
      depois: { status: novoStatus, observacao },
    });
    revalidatePath("/ordens");
    revalidatePath(`/ordens/${osId}`);
    return { ok: true, id: osId };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

// --- Portal do cliente -------------------------------------------------------

export async function gerarLinkPortalAction(osId: string): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "ordens", "ENVIAR_APROVACAO");
  if (negado) return negado;
  try {
    const token = await gerarPortalToken(ctx.db, osId);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return { ok: true, url: `${base}/portal/${token}` };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

// --- Checklist de inspeção (DVI) --------------------------------------------

export async function iniciarChecklistAction(osId: string): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  try {
    await criarChecklist(ctx.db, ctx.oficinaId, osId);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function atualizarChecklistAction(
  osId: string,
  itemId: string,
  status: StatusChecklist,
  observacao?: string
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  try {
    await atualizarItemChecklist(ctx.db, itemId, status, observacao);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

// --- Templates de serviço ----------------------------------------------------

export async function aplicarTemplateOSAction(
  osId: string,
  templateId: string
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  try {
    const qtd = await aplicarTemplateNaOS(ctx.db, ctx.oficinaId, osId, templateId);
    await osService.recalcularTotais(ctx.db, osId);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true, erro: qtd === 0 ? "Template vazio." : undefined };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function adicionarServicoOSAction(
  osId: string,
  valores: ItemServicoFormValues
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  const parse = itemServicoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const os = await ctx.db.ordemServico.findUnique({
      where: { id: osId },
      select: { id: true },
    });
    if (!os) return { ok: false, erro: "OS não encontrada." };
    await ctx.db.oSServico.create({
      data: {
        oficinaId: ctx.oficinaId,
        ordemServicoId: osId,
        servicoId: parse.data.servicoId ?? null,
        descricao: parse.data.descricao,
        valor: parse.data.valor,
        tempoEstimadoMin: parse.data.tempoEstimadoMin ?? null,
      },
    });
    await osService.recalcularTotais(ctx.db, osId);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function removerServicoOSAction(
  osId: string,
  itemId: string
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  try {
    await ctx.db.oSServico.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
    await osService.recalcularTotais(ctx.db, osId);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function adicionarPecaOSAction(
  osId: string,
  valores: ItemPecaFormValues
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  const parse = itemPecaSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const os = await ctx.db.ordemServico.findUnique({
      where: { id: osId },
      select: { id: true, numero: true },
    });
    if (!os) return { ok: false, erro: "OS não encontrada." };

    let alerta: string | undefined;
    if (parse.data.pecaId) {
      const peca = await ctx.db.peca.findUnique({
        where: { id: parse.data.pecaId },
        select: { quantidade: true, nome: true },
      });
      if (!peca) return { ok: false, erro: "Peça não encontrada no estoque." };
      if (paraNumero(peca.quantidade) < parse.data.quantidade) {
        alerta = `Atenção: estoque de ${peca.nome} (${paraNumero(peca.quantidade)}) é menor que a quantidade lançada.`;
      }
    }

    await ctx.db.oSPeca.create({
      data: {
        oficinaId: ctx.oficinaId,
        ordemServicoId: osId,
        pecaId: parse.data.pecaId ?? null,
        descricao: parse.data.descricao,
        quantidade: parse.data.quantidade,
        valorUnitario: parse.data.valorUnitario,
      },
    });
    await osService.recalcularTotais(ctx.db, osId);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true, erro: alerta };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function removerPecaOSAction(
  osId: string,
  itemId: string
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  try {
    const item = await ctx.db.oSPeca.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, erro: "Item não encontrado." };
    if (item.baixaEfetuada) {
      return {
        ok: false,
        erro: "Esta peça já teve baixa de estoque e não pode ser removida.",
      };
    }
    await ctx.db.oSPeca.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
    await osService.recalcularTotais(ctx.db, osId);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function adicionarDiagnosticoOSAction(
  osId: string,
  valores: ItemDiagnosticoFormValues
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  const parse = itemDiagnosticoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const os = await ctx.db.ordemServico.findUnique({
      where: { id: osId },
      select: { id: true },
    });
    if (!os) return { ok: false, erro: "OS não encontrada." };
    await ctx.db.diagnosticoItem.create({
      data: {
        oficinaId: ctx.oficinaId,
        ordemServicoId: osId,
        sistema: parse.data.sistema,
        descricao: parse.data.descricao,
        urgencia: parse.data.urgencia,
        valorEstimado: parse.data.valorEstimado ?? null,
        recomendacao: parse.data.recomendacao ?? null,
      },
    });
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function removerDiagnosticoOSAction(
  osId: string,
  itemId: string
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  try {
    await ctx.db.diagnosticoItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function ajustarOSAction(
  osId: string,
  valores: AjusteOSFormValues
): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado =
    (await guardPermissao(ctx, "ordens", "EDITAR", "VER_VALORES")) ??
    (await guardEscopoOS(ctx, osId));
  if (negado) return negado;
  const parse = ajusteOSSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await ctx.db.ordemServico.update({
      where: { id: osId },
      data: {
        mecanicoId: parse.data.mecanicoId ?? null,
        descontoValor: parse.data.descontoValor,
        impostoPercent: parse.data.impostoPercent,
        observacoesInternas: parse.data.observacoesInternas ?? null,
      },
    });
    await osService.recalcularTotais(ctx.db, osId);
    revalidatePath(`/ordens/${osId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function gerarLinkAprovacaoAction(osId: string): Promise<ResultadoOS> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "ordens", "ENVIAR_APROVACAO");
  if (negado) return negado;
  try {
    const aprovacao = await criarAprovacao(ctx.db, ctx.oficinaId, osId);
    const os = await ctx.db.ordemServico.findUnique({
      where: { id: osId },
      select: { status: true },
    });
    if (os && (os.status === "RECEBIDO" || os.status === "DIAGNOSTICO")) {
      await osService.mudarStatus(
        ctx.db,
        ctx.oficinaId,
        osId,
        "AGUARDANDO_APROVACAO",
        ctx.usuario.id,
        "Link de aprovação enviado ao cliente."
      );
    }
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "aprovacao",
      entidadeId: aprovacao.id,
      depois: { ordemServicoId: osId, expiraEm: aprovacao.expiraEm },
    });
    revalidatePath(`/ordens/${osId}`);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    return { ok: true, url: `${base}/aprovacao/${aprovacao.token}` };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}
