"use server";

import { revalidatePath } from "next/cache";
import { guardPermissao, requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import { veiculoSchema, type VeiculoFormValues } from "../schemas/veiculo-schemas";
import * as service from "../services/veiculos-service";

export interface ResultadoVeiculo {
  ok: boolean;
  erro?: string;
  id?: string;
}

export async function criarVeiculoAction(
  valores: VeiculoFormValues
): Promise<ResultadoVeiculo> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "veiculos", "CRIAR");
  if (negado) return negado;
  const parse = veiculoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const veiculo = await service.criarVeiculo(ctx.db, parse.data);
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "veiculo",
      entidadeId: veiculo.id,
      depois: parse.data,
    });
    revalidatePath("/veiculos");
    revalidatePath(`/clientes/${parse.data.clienteId}`);
    return { ok: true, id: veiculo.id };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível salvar.",
    };
  }
}

export async function atualizarVeiculoAction(
  id: string,
  valores: VeiculoFormValues
): Promise<ResultadoVeiculo> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "veiculos", "EDITAR");
  if (negado) return negado;
  const parse = veiculoSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const anterior = await ctx.db.veiculo.findUnique({ where: { id } });
    if (!anterior) return { ok: false, erro: "Veículo não encontrado." };
    await service.atualizarVeiculo(ctx.db, id, parse.data);
    await registrarAuditoria(ctx, {
      acao: "UPDATE",
      entidade: "veiculo",
      entidadeId: id,
      antes: anterior,
      depois: parse.data,
    });
    revalidatePath("/veiculos");
    revalidatePath(`/veiculos/${id}`);
    return { ok: true, id };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível salvar.",
    };
  }
}

export async function excluirVeiculoAction(id: string): Promise<ResultadoVeiculo> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "veiculos", "EXCLUIR");
  if (negado) return negado;
  try {
    await service.excluirVeiculo(ctx.db, id);
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível excluir.",
    };
  }
  await registrarAuditoria(ctx, {
    acao: "SOFT_DELETE",
    entidade: "veiculo",
    entidadeId: id,
  });
  revalidatePath("/veiculos");
  return { ok: true };
}
