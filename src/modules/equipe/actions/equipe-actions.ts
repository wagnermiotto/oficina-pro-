"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getPermissoes,
  guardPermissao,
  isSuperAdmin,
  requireOficina,
} from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import { textoOpcional } from "@/shared/utils/zod";
import {
  CHAVE_PROPRIETARIO,
  existeOutroEditorDePermissoes,
} from "@/modules/permissoes/services/permissoes-service";

const perfilSchema = z.object({
  cargo: z.enum([
    "ADMIN",
    "GERENTE",
    "RECEPCIONISTA",
    "MECANICO",
    "FINANCEIRO",
    "ESTOQUISTA",
  ]),
  perfilAcessoId: z.string().uuid().nullable().optional(),
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
  const negado = await guardPermissao(ctx, "equipe", "EDITAR");
  if (negado) return negado;
  const parse = perfilSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  const existente = await ctx.db.funcionarioPerfil.findFirst({
    where: { userId },
    include: {
      perfilAcesso: {
        select: {
          id: true,
          chave: true,
          permissoes: {
            where: { modulo: "permissoes", acao: "EDITAR" },
            select: { id: true },
          },
        },
      },
    },
  });

  const perfilNovoId = dados.perfilAcessoId ?? null;
  const perfilAtualId = existente?.perfilAcessoId ?? null;
  const mudouPerfil = perfilAtualId !== perfilNovoId;

  if (mudouPerfil) {
    // Trocar o perfil de acesso de alguém é administrar permissões.
    const negadoPermissoes = await guardPermissao(ctx, "permissoes", "EDITAR");
    if (negadoPermissoes) return negadoPermissoes;
  }

  // Proteção do Proprietário: só outro Proprietário (ou Super Admin) pode
  // rebaixar ou inativar quem tem o perfil Proprietário.
  const alvoEProprietario = existente?.perfilAcesso?.chave === CHAVE_PROPRIETARIO;
  if (alvoEProprietario && (mudouPerfil || !dados.ativo)) {
    const [minhas, superAdmin] = await Promise.all([
      getPermissoes(ctx),
      isSuperAdmin(ctx.usuario.id),
    ]);
    if (minhas.perfilChave !== CHAVE_PROPRIETARIO && !superAdmin) {
      return {
        ok: false,
        erro: "Apenas o Proprietário pode alterar outro Proprietário.",
      };
    }
  }

  // Regra do último editor: não deixar a oficina sem ninguém que administre
  // permissões (ao rebaixar para um perfil sem permissoes.EDITAR ou inativar).
  const alvoEEditor = (existente?.perfilAcesso?.permissoes.length ?? 0) > 0;
  if (alvoEEditor && existente?.ativo) {
    let perde = !dados.ativo;
    if (!perde && mudouPerfil) {
      const novoConcede = perfilNovoId
        ? await ctx.db.permissaoPerfil.findFirst({
            where: { perfilId: perfilNovoId, modulo: "permissoes", acao: "EDITAR" },
            select: { id: true },
          })
        : null;
      perde = !novoConcede;
    }
    if (perde && !(await existeOutroEditorDePermissoes(ctx.db, { userId }))) {
      return {
        ok: false,
        erro: "A oficina ficaria sem ninguém para gerenciar permissões.",
      };
    }
  }

  const persistir = {
    cargo: dados.cargo,
    perfilAcessoId: perfilNovoId,
    especialidade: dados.especialidade ?? null,
    comissaoPercent: dados.comissaoPercent,
    salario: dados.salario ?? null,
    telefone: dados.telefone ?? null,
    ativo: dados.ativo,
  };
  if (existente) {
    await ctx.db.funcionarioPerfil.update({
      where: { id: existente.id },
      data: persistir,
    });
  } else {
    await ctx.db.funcionarioPerfil.create({
      data: { oficinaId: ctx.oficinaId, userId, ...persistir },
    });
  }
  await registrarAuditoria(ctx, {
    acao: "UPDATE",
    entidade: "funcionario_perfil",
    entidadeId: userId,
    antes: existente
      ? { perfilAcessoId: perfilAtualId, ativo: existente.ativo, cargo: existente.cargo }
      : undefined,
    depois: { ...dados, perfilAcessoId: perfilNovoId },
  });
  revalidatePath("/equipe");
  return { ok: true };
}
