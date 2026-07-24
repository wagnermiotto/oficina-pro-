"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOficina } from "@/shared/lib/session";
import * as service from "../services/template-service";

const itemSchema = z.object({
  tipo: z.enum(["SERVICO", "PECA"]),
  descricao: z.string().min(1, "Descreva o item."),
  valor: z
    .union([z.string(), z.number()])
    .transform((v) => Number(String(v).replace(",", ".")) || 0),
  quantidade: z
    .union([z.string(), z.number()])
    .transform((v) => Number(String(v).replace(",", ".")) || 1),
});

const templateSchema = z.object({
  nome: z.string().min(2, "Informe o nome do pacote.").max(80),
  descricao: z.string().optional().transform((v) => v?.trim() || undefined),
  tipoVeiculo: z
    .enum(["CARRO", "MOTO"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  itens: z.array(itemSchema).min(1, "Adicione ao menos um item."),
});

export type TemplateFormValues = z.input<typeof templateSchema>;

export interface ResultadoTemplate {
  ok: boolean;
  erro?: string;
}

export async function criarTemplateAction(
  valores: TemplateFormValues
): Promise<ResultadoTemplate> {
  const ctx = await requireOficina();
  const parse = templateSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await service.criarTemplate(ctx.db, ctx.oficinaId, {
      nome: parse.data.nome,
      descricao: parse.data.descricao ?? null,
      tipoVeiculo: parse.data.tipoVeiculo ?? null,
      itens: parse.data.itens,
    });
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falhou." };
  }
}

export async function excluirTemplateAction(id: string): Promise<ResultadoTemplate> {
  const ctx = await requireOficina();
  try {
    await service.excluirTemplate(ctx.db, id);
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falhou." };
  }
}
