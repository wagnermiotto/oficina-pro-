"use server";

import { revalidatePath } from "next/cache";
import type { StatusPedidoCompra } from "@prisma/client";
import { requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import {
  fornecedorSchema,
  pedidoCompraSchema,
  type FornecedorFormValues,
  type PedidoCompraFormValues,
} from "../schemas/compras-schemas";
import * as service from "../services/compras-service";

export interface ResultadoCompras {
  ok: boolean;
  erro?: string;
  id?: string;
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Operação falhou.";
}

export async function criarFornecedorAction(
  valores: FornecedorFormValues
): Promise<ResultadoCompras> {
  const ctx = await requireOficina();
  const parse = fornecedorSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const fornecedor = await service.criarFornecedor(ctx.db, ctx.oficinaId, parse.data);
  await registrarAuditoria(ctx, {
    acao: "CREATE",
    entidade: "fornecedor",
    entidadeId: fornecedor.id,
    depois: parse.data,
  });
  revalidatePath("/compras");
  return { ok: true, id: fornecedor.id };
}

export async function atualizarFornecedorAction(
  id: string,
  valores: FornecedorFormValues
): Promise<ResultadoCompras> {
  const ctx = await requireOficina();
  const parse = fornecedorSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await service.atualizarFornecedor(ctx.db, id, parse.data);
    revalidatePath("/compras");
    return { ok: true, id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function excluirFornecedorAction(id: string): Promise<ResultadoCompras> {
  const ctx = await requireOficina();
  try {
    await service.excluirFornecedor(ctx.db, id);
    await registrarAuditoria(ctx, {
      acao: "SOFT_DELETE",
      entidade: "fornecedor",
      entidadeId: id,
    });
    revalidatePath("/compras");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function criarPedidoAction(
  valores: PedidoCompraFormValues
): Promise<ResultadoCompras> {
  const ctx = await requireOficina();
  const parse = pedidoCompraSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const pedido = await service.criarPedido(ctx.db, ctx.oficinaId, parse.data);
    await registrarAuditoria(ctx, {
      acao: "CREATE",
      entidade: "pedido_compra",
      entidadeId: pedido.id,
      depois: parse.data,
    });
    revalidatePath("/compras");
    return { ok: true, id: pedido.id };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}

export async function mudarStatusPedidoAction(
  pedidoId: string,
  novoStatus: StatusPedidoCompra,
  notaFiscal?: string
): Promise<ResultadoCompras> {
  const ctx = await requireOficina();
  try {
    await service.mudarStatusPedido(
      ctx.db,
      ctx.oficinaId,
      pedidoId,
      novoStatus,
      ctx.usuario.id,
      notaFiscal
    );
    await registrarAuditoria(ctx, {
      acao: "STATUS",
      entidade: "pedido_compra",
      entidadeId: pedidoId,
      depois: { status: novoStatus, notaFiscal },
    });
    revalidatePath("/compras");
    revalidatePath("/estoque");
    revalidatePath("/financeiro");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDe(erro) };
  }
}
