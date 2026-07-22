"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOficina, requireCargo } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import { textoOpcional } from "@/shared/utils/zod";

const perfilSchema = z.object({
  cargo: z.enum([
    "ADMIN",
    "GERENTE",
    "RECEPCIONISTA",
    "MECANICO",
    "FINANCEIRO",
    "ESTOQUISTA",
  ]),
  especialidade: textoOpcional(80),
  comissaoPercent: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 && n <= 100
        ? Math.round(n * 100) / 100
        : 0;
    }),
  salario: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
    }),
  telefone: textoOpcional(20),
  ativo: z.boolean(),
});
export type PerfilFormValues = z.input<typeof perfilSchema>;

export interface ResultadoEquipe {
  ok: boolean;
  erro?: string;
}

/** Cria/atualiza o perfil de funcionário de um membro da oficina. */
export async function salvarPerfilAction(
  userId: string,
  valores: PerfilFormValues
): Promise<ResultadoEquipe> {
  const ctx = await requireOficina();
  try {
    await requireCargo(ctx, "ADMIN", "GERENTE");
  } catch {
    return { ok: false, erro: "Apenas administradores e gerentes editam a equipe." };
  }
  const parse = perfilSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  const existente = await ctx.db.funcionarioPerfil.findFirst({
    where: { userId },
  });
  if (existente) {
    await ctx.db.funcionarioPerfil.update({
      where: { id: existente.id },
      data: {
        cargo: dados.cargo,
        especialidade: dados.especialidade ?? null,
        comissaoPercent: dados.comissaoPercent,
        salario: dados.salario ?? null,
        telefone: dados.telefone ?? null,
        ativo: dados.ativo,
      },
    });
  } else {
    await ctx.db.funcionarioPerfil.create({
      data: {
        oficinaId: ctx.oficinaId,
        userId,
        cargo: dados.cargo,
        especialidade: dados.especialidade ?? null,
        comissaoPercent: dados.comissaoPercent,
        salario: dados.salario ?? null,
        telefone: dados.telefone ?? null,
        ativo: dados.ativo,
      },
    });
  }
  await registrarAuditoria(ctx, {
    acao: "UPDATE",
    entidade: "funcionario_perfil",
    entidadeId: userId,
    depois: dados,
  });
  revalidatePath("/equipe");
  return { ok: true };
}
