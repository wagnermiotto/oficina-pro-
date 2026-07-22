"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOficina, requireCargo } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import { prisma } from "@/shared/lib/prisma";
import { invalidarNomeOficina } from "@/shared/lib/oficina-cache";
import { textoOpcional } from "@/shared/utils/zod";
import { validarCNPJ } from "@/shared/utils/documento";

const configSchema = z.object({
  nomeOficina: z.string().min(2, "Informe o nome da oficina.").max(80),
  cnpj: z
    .string()
    .optional()
    .refine((v) => !v || v.trim() === "" || validarCNPJ(v), "CNPJ inválido.")
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
  razaoSocial: textoOpcional(160),
  telefone: textoOpcional(20),
  whatsapp: textoOpcional(20),
  email: z
    .union([z.literal(""), z.email("E-mail inválido.")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  cep: textoOpcional(9),
  endereco: textoOpcional(160),
  numero: textoOpcional(20),
  bairro: textoOpcional(80),
  cidade: textoOpcional(80),
  estado: textoOpcional(2),
  valorHoraPadrao: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
    }),
  impostoPadraoPercent: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 && n <= 100
        ? Math.round(n * 100) / 100
        : 0;
    }),
  garantiaPadraoDias: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 90;
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 ? n : 90;
    }),
});
export type ConfigFormValues = z.input<typeof configSchema>;

export interface ResultadoConfig {
  ok: boolean;
  erro?: string;
}

export async function salvarConfigAction(
  valores: ConfigFormValues
): Promise<ResultadoConfig> {
  const ctx = await requireOficina();
  try {
    await requireCargo(ctx, "ADMIN", "GERENTE");
  } catch {
    return { ok: false, erro: "Apenas administradores e gerentes alteram configurações." };
  }
  const parse = configSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { nomeOficina, ...config } = parse.data;

  await prisma.organization.update({
    where: { id: ctx.oficinaId },
    data: { name: nomeOficina },
  });
  invalidarNomeOficina(ctx.oficinaId);
  await ctx.db.oficinaConfig.upsert({
    where: { oficinaId: ctx.oficinaId },
    create: { oficinaId: ctx.oficinaId, ...config },
    update: config,
  });

  await registrarAuditoria(ctx, {
    acao: "UPDATE",
    entidade: "oficina_config",
    depois: parse.data,
  });
  revalidatePath("/configuracoes");
  revalidatePath("/", "layout");
  return { ok: true };
}
