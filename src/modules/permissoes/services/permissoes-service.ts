import type { Prisma, PrismaClient } from "@prisma/client";
import type { TenantDb } from "@/shared/lib/tenant-db";
import {
  MODULOS_SISTEMA,
  chave,
  permissaoValida,
  todasPermissoes,
  type ChavePermissao,
} from "@/shared/permissoes/catalogo";

/**
 * RBAC dinâmico: CRUD de perfis de acesso e da matriz módulo×ação.
 * Regras de proteção (Proprietário travado, último editor) vivem aqui para
 * serem testáveis sem HTTP.
 */

type Tx = Prisma.TransactionClient | PrismaClient;

export const CHAVE_PROPRIETARIO = "PROPRIETARIO";

interface SeedPerfil {
  chave: string;
  nome: string;
  descricao: string;
  permissoes: { modulo: string; acao: string }[];
}

function todasDoModulo(modulo: keyof typeof MODULOS_SISTEMA) {
  return MODULOS_SISTEMA[modulo].acoes.map((acao) => ({ modulo, acao }));
}

/** Os 7 perfis padrão (D6 do plano). */
export function seedsPerfisPadrao(): SeedPerfil[] {
  return [
    {
      chave: CHAVE_PROPRIETARIO,
      nome: "Proprietário",
      descricao: "Acesso total ao sistema, sem restrições.",
      permissoes: todasPermissoes(),
    },
    {
      chave: "GERENTE",
      nome: "Gerente",
      descricao: "Tudo, exceto administrar perfis e permissões.",
      permissoes: todasPermissoes().filter(
        (p) => !(p.modulo === "permissoes" && p.acao === "EDITAR")
      ),
    },
    {
      chave: "FINANCEIRO",
      nome: "Financeiro",
      descricao: "Caixa, contas, fluxo e relatórios.",
      permissoes: [
        { modulo: "dashboard", acao: "VISUALIZAR" },
        ...todasDoModulo("financeiro"),
        ...todasDoModulo("relatorios"),
      ],
    },
    {
      chave: "ATENDENTE",
      nome: "Atendente",
      descricao: "Recepção: clientes, veículos, agenda, orçamentos e OS.",
      permissoes: [
        { modulo: "dashboard", acao: "VISUALIZAR" },
        { modulo: "clientes", acao: "VISUALIZAR" },
        { modulo: "clientes", acao: "CRIAR" },
        { modulo: "clientes", acao: "EDITAR" },
        { modulo: "veiculos", acao: "VISUALIZAR" },
        { modulo: "veiculos", acao: "CRIAR" },
        { modulo: "veiculos", acao: "EDITAR" },
        ...todasDoModulo("agenda"),
        ...todasDoModulo("crm"),
        { modulo: "ordens", acao: "VISUALIZAR" },
        { modulo: "ordens", acao: "VISUALIZAR_TODAS" },
        { modulo: "ordens", acao: "CRIAR" },
        { modulo: "ordens", acao: "EDITAR" },
        { modulo: "ordens", acao: "MUDAR_STATUS" },
        { modulo: "ordens", acao: "ENVIAR_APROVACAO" },
        { modulo: "ordens", acao: "VER_VALORES" },
      ],
    },
    {
      chave: "MECANICO",
      nome: "Mecânico",
      descricao: "Somente as próprias OS: execução, checklist e status.",
      permissoes: [
        { modulo: "dashboard", acao: "VISUALIZAR" },
        { modulo: "ordens", acao: "VISUALIZAR" },
        { modulo: "ordens", acao: "EDITAR" },
        { modulo: "ordens", acao: "MUDAR_STATUS" },
      ],
    },
    {
      chave: "ESTOQUISTA",
      nome: "Estoquista",
      descricao: "Estoque, movimentações, compras e fornecedores.",
      permissoes: [
        { modulo: "dashboard", acao: "VISUALIZAR" },
        ...todasDoModulo("estoque"),
        ...todasDoModulo("compras"),
      ],
    },
    {
      chave: "RH",
      nome: "RH",
      descricao: "Equipe e colaboradores (módulo RH completo em breve).",
      permissoes: [
        { modulo: "dashboard", acao: "VISUALIZAR" },
        ...todasDoModulo("equipe"),
        { modulo: "rh", acao: "VISUALIZAR" },
        { modulo: "rh", acao: "CRIAR" },
        { modulo: "rh", acao: "EDITAR" },
        { modulo: "rh", acao: "EXCLUIR" },
      ],
    },
  ];
}

/**
 * Cria (ou completa) os perfis padrão de uma oficina. Idempotente por
 * `chave`: perfis já existentes NÃO têm a matriz sobrescrita (respeita
 * personalizações do dono). Aceita TransactionClient p/ rodar no $transaction
 * do onboarding. Retorna o id do perfil Proprietário.
 */
export async function semearPerfisPadrao(tx: Tx, oficinaId: string): Promise<string> {
  let proprietarioId = "";
  for (const seed of seedsPerfisPadrao()) {
    const existente = await tx.perfilAcesso.findFirst({
      where: { oficinaId, chave: seed.chave, deletedAt: null },
      select: { id: true },
    });
    if (existente) {
      if (seed.chave === CHAVE_PROPRIETARIO) proprietarioId = existente.id;
      continue;
    }
    const perfil = await tx.perfilAcesso.create({
      data: {
        oficinaId,
        nome: seed.nome,
        descricao: seed.descricao,
        sistema: true,
        chave: seed.chave,
        permissoes: {
          create: seed.permissoes.map(({ modulo, acao }) => ({
            oficinaId,
            modulo,
            acao,
          })),
        },
      },
      select: { id: true },
    });
    if (seed.chave === CHAVE_PROPRIETARIO) proprietarioId = perfil.id;
  }
  return proprietarioId;
}

/** Perfis ativos da oficina com matriz e contagem de funcionários. */
export async function listarPerfis(db: TenantDb) {
  const perfis = await db.perfilAcesso.findMany({
    where: { ativo: true },
    orderBy: [{ sistema: "desc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      descricao: true,
      sistema: true,
      chave: true,
      permissoes: { select: { modulo: true, acao: true } },
      _count: {
        select: { funcionarios: { where: { deletedAt: null, ativo: true } } },
      },
    },
  });
  return perfis.map((p) => ({
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    sistema: p.sistema,
    chave: p.chave,
    permissoes: p.permissoes,
    qtdFuncionarios: p._count.funcionarios,
  }));
}

async function validarNomeLivre(db: TenantDb, nome: string, ignorarId?: string) {
  const existente = await db.perfilAcesso.findFirst({
    where: { nome: { equals: nome.trim(), mode: "insensitive" }, deletedAt: null },
    select: { id: true },
  });
  if (existente && existente.id !== ignorarId) {
    throw new Error(`Já existe um perfil chamado "${nome.trim()}".`);
  }
}

export async function criarPerfil(
  db: TenantDb,
  oficinaId: string,
  dados: { nome: string; descricao?: string; permissoes: { modulo: string; acao: string }[] }
) {
  await validarNomeLivre(db, dados.nome);
  const permissoes = dados.permissoes.filter((p) => permissaoValida(p.modulo, p.acao));
  return db.perfilAcesso.create({
    data: {
      oficinaId,
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      sistema: false,
      permissoes: {
        create: permissoes.map(({ modulo, acao }) => ({ oficinaId, modulo, acao })),
      },
    },
    select: { id: true, nome: true },
  });
}

export async function duplicarPerfil(db: TenantDb, oficinaId: string, origemId: string, novoNome: string) {
  const origem = await db.perfilAcesso.findFirst({
    where: { id: origemId, deletedAt: null },
    select: { permissoes: { select: { modulo: true, acao: true } }, descricao: true },
  });
  if (!origem) throw new Error("Perfil de origem não encontrado.");
  return criarPerfil(db, oficinaId, {
    nome: novoNome,
    descricao: origem.descricao ?? undefined,
    permissoes: origem.permissoes,
  });
}

export async function renomearPerfil(db: TenantDb, perfilId: string, nome: string, descricao?: string) {
  const perfil = await db.perfilAcesso.findFirst({
    where: { id: perfilId, deletedAt: null },
    select: { sistema: true },
  });
  if (!perfil) throw new Error("Perfil não encontrado.");
  if (perfil.sistema) throw new Error("Perfis padrão do sistema não podem ser renomeados.");
  await validarNomeLivre(db, nome, perfilId);
  return db.perfilAcesso.update({
    where: { id: perfilId },
    data: { nome: nome.trim(), descricao: descricao?.trim() || null },
    select: { id: true, nome: true },
  });
}

export async function excluirPerfil(db: TenantDb, perfilId: string) {
  const perfil = await db.perfilAcesso.findFirst({
    where: { id: perfilId, deletedAt: null },
    select: {
      sistema: true,
      nome: true,
      _count: { select: { funcionarios: { where: { deletedAt: null, ativo: true } } } },
    },
  });
  if (!perfil) throw new Error("Perfil não encontrado.");
  if (perfil.sistema) throw new Error("Perfis padrão do sistema não podem ser excluídos.");
  if (perfil._count.funcionarios > 0) {
    throw new Error(
      `O perfil "${perfil.nome}" está em uso por ${perfil._count.funcionarios} funcionário(s). Reatribua-os antes de excluir.`
    );
  }
  return db.perfilAcesso.update({
    where: { id: perfilId },
    data: { deletedAt: new Date(), ativo: false },
    select: { id: true, nome: true },
  });
}

/**
 * Substitui a matriz inteira de um perfil (salvamento em lote da UI).
 * Proprietário é travado. Retorna { antes, depois } p/ auditoria.
 */
export async function substituirMatriz(
  db: TenantDb,
  oficinaId: string,
  perfilId: string,
  permissoes: { modulo: string; acao: string }[]
) {
  const perfil = await db.perfilAcesso.findFirst({
    where: { id: perfilId, deletedAt: null },
    select: { chave: true, permissoes: { select: { modulo: true, acao: true } } },
  });
  if (!perfil) throw new Error("Perfil não encontrado.");
  if (perfil.chave === CHAVE_PROPRIETARIO) {
    throw new Error("A matriz do Proprietário não pode ser alterada.");
  }
  const validas = permissoes.filter((p) => permissaoValida(p.modulo, p.acao));
  // Dedup (o unique do banco pegaria, mas melhor erro amigável).
  const vistos = new Set<string>();
  const unicas = validas.filter((p) => {
    const c = chave(p.modulo, p.acao);
    if (vistos.has(c)) return false;
    vistos.add(c);
    return true;
  });

  await db.$transaction([
    db.permissaoPerfil.deleteMany({ where: { perfilId } }),
    db.permissaoPerfil.createMany({
      data: unicas.map(({ modulo, acao }) => ({ oficinaId, perfilId, modulo, acao })),
    }),
  ]);

  return {
    antes: perfil.permissoes.map((p) => chave(p.modulo, p.acao)).sort(),
    depois: unicas.map((p) => chave(p.modulo, p.acao)).sort(),
  };
}

/**
 * Existe OUTRO funcionário ativo (além dos ignorados) cujo perfil concede
 * permissoes.EDITAR? Usado para nunca deixar a oficina sem administrador
 * de permissões (regra do último editor).
 */
export async function existeOutroEditorDePermissoes(
  db: TenantDb,
  ignorar: { userId?: string; perfilId?: string } = {}
): Promise<boolean> {
  const outro = await db.funcionarioPerfil.findFirst({
    where: {
      ativo: true,
      deletedAt: null,
      ...(ignorar.userId ? { userId: { not: ignorar.userId } } : {}),
      perfilAcesso: {
        deletedAt: null,
        ativo: true,
        ...(ignorar.perfilId ? { id: { not: ignorar.perfilId } } : {}),
        permissoes: { some: { modulo: "permissoes", acao: "EDITAR" } },
      },
    },
    select: { id: true },
  });
  return Boolean(outro);
}

/** Normaliza pares em Set de chaves, aplicando implicações (TODAS ⇒ VISUALIZAR). */
export function normalizarChaves(
  permissoes: { modulo: string; acao: string }[]
): Set<ChavePermissao> {
  const chaves = new Set<ChavePermissao>();
  for (const { modulo, acao } of permissoes) {
    chaves.add(chave(modulo, acao));
    if (acao === "VISUALIZAR_TODAS") chaves.add(chave(modulo, "VISUALIZAR"));
  }
  return chaves;
}
