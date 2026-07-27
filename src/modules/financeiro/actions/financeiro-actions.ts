"use server";

import { revalidatePath } from "next/cache";
import type { FormaPagamento } from "@prisma/client";
import { guardPermissao, requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import {
  lancamentoSchema,
  pagamentoSchema,
  type LancamentoFormValues,
} from "../schemas/financeiro-schemas";
import * as service from "../services/financeiro-service";

export interface ResultadoFinanceiro {
  ok: boolean;
  erro?: string;
  id?: string;
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Operação falhou.";
}

export async function criarLancamentoAction(
  valores: LancamentoFormValues
): Promise<ResultadoFinanceiro> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "financeiro", "CRIAR");
  if (negado) return negado;
  const parse = lancamentoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const lancamento = await service.criarLancamento(
      ctx.db,
      ctx.oficinaId,
      parse.data
    );
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "lancamento_financeiro",
      entidadeId: lancamento.id,
      depois: parse.data,
    });
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return { ok: true, id: lancamento.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function marcarPagoAction(
  id: string,
  formaPagamento: FormaPagamento
): Promise<ResultadoFinanceiro> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "financeiro", "EDITAR");
  if (negado) return negado;
  const parse = pagamentoSchema.safeParse({ formaPagamento });
  if (!parse.success) {
    return { ok: false, erro: "Forma de pagamento inválida." };
  }
  try {
    await service.marcarPago(ctx.db, id, parse.data.formaPagamento);
    await registrarAuditoria(ctx, {
      acao: "PAGAMENTO",
      entidade: "lancamento_financeiro",
      entidadeId: id,
      depois: { formaPagamento },
    });
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function cancelarLancamentoAction(
  id: string
): Promise<ResultadoFinanceiro> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "financeiro", "EXCLUIR");
  if (negado) return negado;
  try {
    await service.cancelarLancamento(ctx.db, id);
    await registrarAuditoria(ctx, {
      acao: "CANCELAMENTO",
      entidade: "lancamento_financeiro",
      entidadeId: id,
    });
    revalidatePath("/financeiro");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function pagarComissaoAction(id: string): Promise<ResultadoFinanceiro> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "financeiro", "EDITAR");
  if (negado) return negado;
  try {
    await service.pagarComissao(ctx.db, ctx.oficinaId, id);
    await registrarAuditoria(ctx, {
      acao: "PAGAMENTO",
      entidade: "comissao",
      entidadeId: id,
    });
    revalidatePath("/financeiro");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}
