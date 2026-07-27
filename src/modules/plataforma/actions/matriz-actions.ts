"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { StatusAssinatura } from "@prisma/client";
import { requireSuperAdmin } from "@/shared/lib/session";
import { registrarAuditoriaPlataforma } from "@/shared/lib/audit";
import * as matriz from "../services/matriz-service";

export interface ResultadoMatriz {
  ok: boolean;
  erro?: string;
}

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Operação falhou.";
}

const texto = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => v?.trim() || undefined);

const novaOficinaSchema = z.object({
  nome: z.string().min(2, "Informe o nome da oficina.").max(80),
  cnpj: texto(20),
  razaoSocial: texto(120),
  responsavelNome: texto(80),
  responsavelCpf: texto(15),
  emailDono: z.string().email("E-mail do responsável inválido."),
  telefone: texto(20),
  whatsapp: texto(20),
  cep: texto(10),
  endereco: texto(120),
  numero: texto(10),
  bairro: texto(60),
  cidade: texto(60),
  estado: texto(2),
  planoId: z.string().uuid("Selecione o plano."),
  vencimento: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: "Data de vencimento inválida.",
  }),
  diasBloqueio: z.coerce.number().int().min(0).max(60).optional(),
  statusInicial: z.enum(["ATIVO", "PENDENTE"]).optional(),
  observacoes: texto(300),
  maxUsers: z.coerce.number().int().min(0).max(9999).optional(),
  iaEnabled: z.boolean().optional(),
  biEnabled: z.boolean().optional(),
});
export type NovaOficinaFormValues = z.input<typeof novaOficinaSchema>;

export interface ResultadoNovaOficina extends ResultadoMatriz {
  oficinaId?: string;
  /** Exibida UMA única vez ao Super Admin quando a conta do dono foi criada. */
  senhaProvisoria?: string | null;
  emailDono?: string;
}

export async function criarOficinaMatrizAction(
  valores: NovaOficinaFormValues
): Promise<ResultadoNovaOficina> {
  const ctx = await requireSuperAdmin();
  const parse = novaOficinaSchema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    const resultado = await matriz.criarOficinaCompleta({
      ...parse.data,
      vencimento: new Date(parse.data.vencimento),
    });
    await registrarAuditoriaPlataforma(ctx.usuario.id, resultado.oficinaId, {
      acao: "CREATE_OFICINA",
      entidade: "organization",
      entidadeId: resultado.oficinaId,
      depois: { nome: parse.data.nome, emailDono: resultado.emailDono },
    });
    revalidatePath("/matriz");
    revalidatePath("/matriz/oficinas");
    return {
      ok: true,
      oficinaId: resultado.oficinaId,
      senhaProvisoria: resultado.senhaProvisoria,
      emailDono: resultado.emailDono,
    };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function editarOficinaMatrizAction(
  oficinaId: string,
  valores: Omit<NovaOficinaFormValues, "planoId" | "vencimento" | "emailDono"> & {
    emailContato?: string;
  }
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  const schema = novaOficinaSchema
    .omit({ planoId: true, vencimento: true, emailDono: true })
    .extend({ emailContato: texto(120) });
  const parse = schema.safeParse(valores);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await matriz.editarOficinaMatriz(oficinaId, parse.data);
    await registrarAuditoriaPlataforma(ctx.usuario.id, oficinaId, {
      acao: "UPDATE_OFICINA",
      entidade: "organization",
      entidadeId: oficinaId,
      depois: parse.data,
    });
    revalidatePath("/matriz/oficinas");
    revalidatePath(`/matriz/oficinas/${oficinaId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function salvarRecursoOficinaAction(
  oficinaId: string,
  chave: string,
  valor: string | null
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  const CHAVES_VALIDAS = new Set([
    "max_users",
    "max_branches",
    "max_storage_gb",
    "ia_enabled",
    "bi_enabled",
  ]);
  if (!CHAVES_VALIDAS.has(chave)) {
    return { ok: false, erro: "Recurso desconhecido." };
  }
  try {
    await matriz.salvarRecursoOficina(oficinaId, chave, valor);
    await registrarAuditoriaPlataforma(ctx.usuario.id, oficinaId, {
      acao: "MATRIZ_FEATURE_FLAG",
      entidade: "recurso_oficina",
      entidadeId: oficinaId,
      depois: { chave, valor },
    });
    revalidatePath(`/matriz/oficinas/${oficinaId}`);
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function adicionarSuperAdminAction(
  email: string
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  const parse = z.string().email("E-mail inválido.").safeParse(email?.trim());
  if (!parse.success) return { ok: false, erro: "E-mail inválido." };
  try {
    const admin = await matriz.adicionarSuperAdmin(parse.data);
    await registrarAuditoriaPlataforma(ctx.usuario.id, null, {
      acao: "MATRIZ_ADMIN_ADICIONADO",
      entidade: "plataforma_admin",
      entidadeId: admin.userId,
      depois: { email: parse.data },
    });
    revalidatePath("/matriz/administradores");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function removerSuperAdminAction(
  userId: string
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  try {
    await matriz.removerSuperAdmin(userId, ctx.usuario.id);
    await registrarAuditoriaPlataforma(ctx.usuario.id, null, {
      acao: "MATRIZ_ADMIN_REMOVIDO",
      entidade: "plataforma_admin",
      entidadeId: userId,
    });
    revalidatePath("/matriz/administradores");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function mudarStatusAssinaturaAction(
  oficinaId: string,
  status: StatusAssinatura
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  try {
    await matriz.mudarStatusAssinatura(oficinaId, status);
    await registrarAuditoriaPlataforma(ctx.usuario.id, oficinaId, {
      acao: "MATRIZ_STATUS",
      entidade: "assinatura",
      entidadeId: oficinaId,
      depois: { status },
    });
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function criarAssinaturaAction(
  oficinaId: string,
  planoId: string
): Promise<ResultadoMatriz> {
  const ctx = await requireSuperAdmin();
  try {
    await matriz.criarAssinatura(oficinaId, planoId);
    await registrarAuditoriaPlataforma(ctx.usuario.id, oficinaId, {
      acao: "MATRIZ_ASSINATURA_CRIADA",
      entidade: "assinatura",
      entidadeId: oficinaId,
      depois: { planoId },
    });
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function renovarAssinaturaAction(
  oficinaId: string
): Promise<ResultadoMatriz> {
  await requireSuperAdmin();
  try {
    await matriz.renovarAssinatura(oficinaId);
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function definirVencimentoAction(
  oficinaId: string,
  vencimento: string
): Promise<ResultadoMatriz> {
  await requireSuperAdmin();
  const data = new Date(vencimento);
  if (Number.isNaN(data.getTime())) {
    return { ok: false, erro: "Data de vencimento inválida." };
  }
  try {
    await matriz.definirVencimento(oficinaId, data);
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}

export async function trocarPlanoAction(
  oficinaId: string,
  planoId: string
): Promise<ResultadoMatriz> {
  await requireSuperAdmin();
  try {
    await matriz.trocarPlano(oficinaId, planoId);
    revalidatePath("/matriz");
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagem(erro) };
  }
}
