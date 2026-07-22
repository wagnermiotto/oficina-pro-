"use server";

import { revalidatePath } from "next/cache";
import { requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import { clienteSchema, type ClienteFormValues } from "../schemas/cliente-schemas";
import * as service from "../services/clientes-service";

export interface ResultadoCliente {
  ok: boolean;
  erro?: string;
  id?: string;
}

export async function criarClienteAction(
  valores: ClienteFormValues
): Promise<ResultadoCliente> {
  const ctx = await requireOficina();
  const parse = clienteSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const cliente = await service.criarCliente(ctx.db, parse.data);
  await registrarAuditoria(ctx, {
    acao: "CREATE",
    entidade: "cliente",
    entidadeId: cliente.id,
    depois: parse.data,
  });
  revalidatePath("/clientes");
  return { ok: true, id: cliente.id };
}

export async function atualizarClienteAction(
  id: string,
  valores: ClienteFormValues
): Promise<ResultadoCliente> {
  const ctx = await requireOficina();
  const parse = clienteSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const anterior = await ctx.db.cliente.findUnique({ where: { id } });
  if (!anterior) return { ok: false, erro: "Cliente não encontrado." };
  await service.atualizarCliente(ctx.db, id, parse.data);
  await registrarAuditoria(ctx, {
    acao: "UPDATE",
    entidade: "cliente",
    entidadeId: id,
    antes: anterior,
    depois: parse.data,
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, id };
}

export async function excluirClienteAction(id: string): Promise<ResultadoCliente> {
  const ctx = await requireOficina();
  try {
    await service.excluirCliente(ctx.db, id);
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível excluir.",
    };
  }
  await registrarAuditoria(ctx, {
    acao: "SOFT_DELETE",
    entidade: "cliente",
    entidadeId: id,
  });
  revalidatePath("/clientes");
  return { ok: true };
}
