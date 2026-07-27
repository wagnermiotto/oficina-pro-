import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma, StatusAssinatura } from "@prisma/client";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { paraNumero } from "@/shared/utils/moeda";
import { semearPerfisPadrao } from "@/modules/permissoes/services/permissoes-service";

const POR_PAGINA = 20;

/** Recalcula status vencido→atrasado/bloqueado (mesma regra do bloqueio lazy). */
export function statusEfetivo(a: {
  status: StatusAssinatura;
  vencimento: Date;
  diasBloqueio: number;
}): StatusAssinatura {
  if (a.status !== "ATIVO" && a.status !== "PENDENTE" && a.status !== "ATRASADO") {
    return a.status;
  }
  const agora = new Date();
  const limite = new Date(a.vencimento);
  limite.setDate(limite.getDate() + a.diasBloqueio);
  if (limite < agora) return "BLOQUEADO";
  if (a.vencimento < agora) return "ATRASADO";
  return a.status;
}

// --- Dashboard ---------------------------------------------------------------

export async function resumoMatriz() {
  const [assinaturas, planos, novas30, novas90, acessos7d] = await Promise.all([
    prisma.assinatura.findMany({
      include: { plano: { select: { nome: true, precoMensal: true } } },
    }),
    prisma.plano.findMany({ where: { ativo: true }, orderBy: { precoMensal: "asc" } }),
    prisma.organization.count({
      where: { createdAt: { gte: diasAtras(30) } },
    }),
    prisma.organization.count({
      where: { createdAt: { gte: diasAtras(90) } },
    }),
    prisma.auditLog.count({
      where: { acao: "LOGIN", createdAt: { gte: diasAtras(7) } },
    }),
  ]);

  const efetivas = assinaturas.map((a) => ({ ...a, efetivo: statusEfetivo(a) }));
  const conta = (s: StatusAssinatura) =>
    efetivas.filter((a) => a.efetivo === s).length;

  const receitaAtiva = efetivas
    .filter((a) => a.efetivo === "ATIVO")
    .reduce((soma, a) => soma + paraNumero(a.plano.precoMensal), 0);

  const porPlano = planos.map((p) => ({
    nome: p.nome,
    oficinas: efetivas.filter((a) => a.planoId === p.id).length,
  }));

  const vencendo = efetivas
    .filter((a) => a.efetivo === "ATRASADO" || a.efetivo === "PENDENTE")
    .sort((x, y) => x.vencimento.getTime() - y.vencimento.getTime())
    .slice(0, 8);

  return {
    totalOficinas: assinaturas.length,
    ativas: conta("ATIVO"),
    bloqueadas: conta("BLOQUEADO"),
    suspensas: conta("SUSPENSO"),
    atrasadas: conta("ATRASADO"),
    pendentes: conta("PENDENTE"),
    acessos7d,
    receitaAtiva: Math.round(receitaAtiva * 100) / 100,
    porPlano,
    vencendo: vencendo.map((a) => ({
      oficinaId: a.oficinaId,
      plano: a.plano.nome,
      status: a.efetivo,
      vencimento: a.vencimento,
    })),
    novas30,
    novas90,
  };
}

// --- Oficinas ----------------------------------------------------------------

export async function listarOficinas({
  busca,
  status,
  pagina,
}: {
  busca?: string;
  status?: StatusAssinatura;
  pagina: number;
}) {
  const where: Prisma.OrganizationWhereInput = {
    ...(busca ? { name: { contains: busca, mode: "insensitive" } } : {}),
    ...(status ? { assinatura: { status } } : {}),
  };
  const [itens, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        assinatura: { include: { plano: { select: { nome: true } } } },
        _count: { select: { members: true, ordensServico: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);
  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

// --- Nova oficina (cadastro completo pela Matriz) ----------------------------

export interface DadosNovaOficina {
  nome: string;
  cnpj?: string;
  razaoSocial?: string;
  responsavelNome?: string;
  responsavelCpf?: string;
  emailDono: string;
  telefone?: string;
  whatsapp?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  planoId: string;
  vencimento: Date;
  diasBloqueio?: number;
  statusInicial?: Extract<StatusAssinatura, "ATIVO" | "PENDENTE">;
  observacoes?: string;
  maxUsers?: number;
  iaEnabled?: boolean;
  biEnabled?: boolean;
}

function gerarSlugOficina(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "oficina"}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Cria a empresa inteira pela Matriz: Organization + OficinaConfig +
 * CentroCusto + perfis RBAC + usuário dono (Proprietário) + Assinatura +
 * feature flags. Se o e-mail do dono ainda não existir, cria a conta com
 * senha provisória (retornada UMA vez para o Super Admin repassar).
 */
export async function criarOficinaCompleta(dados: DadosNovaOficina) {
  const emailDono = dados.emailDono.trim().toLowerCase();

  // 1) Usuário dono — fora da transação (Better Auth tem hashing próprio).
  let dono = await prisma.user.findFirst({ where: { email: emailDono } });
  let senhaProvisoria: string | null = null;
  if (!dono) {
    senhaProvisoria = randomBytes(6).toString("base64url");
    await auth.api.signUpEmail({
      body: {
        name: dados.responsavelNome?.trim() || dados.nome,
        email: emailDono,
        password: senhaProvisoria,
      },
    });
    dono = await prisma.user.findFirst({ where: { email: emailDono } });
    if (!dono) throw new Error("Não foi possível criar o usuário dono.");
  }
  const donoId = dono.id;

  // 2) Estrutura da empresa em transação única.
  const oficinaId = gerarSlugOficina(dados.nome);
  await prisma.$transaction(async (tx) => {
    await tx.organization.create({
      data: {
        id: oficinaId,
        name: dados.nome.trim(),
        slug: oficinaId,
        createdAt: new Date(),
      },
    });
    await tx.oficinaConfig.create({
      data: {
        oficinaId,
        cnpj: dados.cnpj?.trim() || null,
        razaoSocial: dados.razaoSocial?.trim() || null,
        responsavelNome: dados.responsavelNome?.trim() || null,
        responsavelCpf: dados.responsavelCpf?.trim() || null,
        email: emailDono,
        telefone: dados.telefone?.trim() || null,
        whatsapp: dados.whatsapp?.trim() || null,
        cep: dados.cep?.trim() || null,
        endereco: dados.endereco?.trim() || null,
        numero: dados.numero?.trim() || null,
        bairro: dados.bairro?.trim() || null,
        cidade: dados.cidade?.trim() || null,
        estado: dados.estado?.trim() || null,
      },
    });
    await tx.centroCusto.create({ data: { oficinaId, nome: "Geral" } });

    const proprietarioId = await semearPerfisPadrao(tx, oficinaId);
    await tx.member.create({
      data: {
        id: randomUUID(),
        organizationId: oficinaId,
        userId: donoId,
        role: "owner",
        createdAt: new Date(),
      },
    });
    await tx.funcionarioPerfil.create({
      data: {
        oficinaId,
        userId: donoId,
        cargo: "ADMIN",
        perfilAcessoId: proprietarioId,
      },
    });

    await tx.assinatura.create({
      data: {
        oficinaId,
        planoId: dados.planoId,
        status: dados.statusInicial ?? "ATIVO",
        vencimento: dados.vencimento,
        diasBloqueio: dados.diasBloqueio ?? 7,
        observacoes: dados.observacoes?.trim() || null,
      },
    });

    const flags: { chave: string; valor: string }[] = [];
    if (dados.maxUsers && dados.maxUsers > 0) {
      flags.push({ chave: "max_users", valor: String(dados.maxUsers) });
    }
    if (dados.iaEnabled !== undefined) {
      flags.push({ chave: "ia_enabled", valor: String(dados.iaEnabled) });
    }
    if (dados.biEnabled !== undefined) {
      flags.push({ chave: "bi_enabled", valor: String(dados.biEnabled) });
    }
    if (flags.length > 0) {
      await tx.recursoOficina.createMany({
        data: flags.map((f) => ({ oficinaId, ...f })),
      });
    }
  });

  return { oficinaId, donoId, emailDono, senhaProvisoria };
}

/** Edição cadastral pela Matriz (nome + dados da config). */
export async function editarOficinaMatriz(
  oficinaId: string,
  dados: Omit<DadosNovaOficina, "planoId" | "vencimento" | "emailDono" | "statusInicial"> & {
    emailContato?: string;
  }
) {
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: oficinaId },
      data: { name: dados.nome.trim() },
    }),
    prisma.oficinaConfig.upsert({
      where: { oficinaId },
      create: { oficinaId },
      update: {
        cnpj: dados.cnpj?.trim() || null,
        razaoSocial: dados.razaoSocial?.trim() || null,
        responsavelNome: dados.responsavelNome?.trim() || null,
        responsavelCpf: dados.responsavelCpf?.trim() || null,
        email: dados.emailContato?.trim() || null,
        telefone: dados.telefone?.trim() || null,
        whatsapp: dados.whatsapp?.trim() || null,
        cep: dados.cep?.trim() || null,
        endereco: dados.endereco?.trim() || null,
        numero: dados.numero?.trim() || null,
        bairro: dados.bairro?.trim() || null,
        cidade: dados.cidade?.trim() || null,
        estado: dados.estado?.trim() || null,
      },
    }),
  ]);
}

/** Detalhe completo de uma oficina para a Matriz (cadastro + métricas). */
export async function detalheOficina(oficinaId: string) {
  const [oficina, membros, veiculos, clientes, ordens, flags] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: oficinaId },
      include: {
        config: true,
        assinatura: { include: { plano: { select: { id: true, nome: true } } } },
      },
    }),
    prisma.member.findMany({
      where: { organizationId: oficinaId },
      select: { userId: true },
    }),
    prisma.veiculo.count({ where: { oficinaId, deletedAt: null } }),
    prisma.cliente.count({ where: { oficinaId, deletedAt: null } }),
    prisma.ordemServico.count({ where: { oficinaId, deletedAt: null } }),
    prisma.recursoOficina.findMany({ where: { oficinaId } }),
  ]);
  if (!oficina) return null;

  const userIds = membros.map((m) => m.userId);
  const sessao =
    userIds.length > 0
      ? await prisma.session.findFirst({
          where: { userId: { in: userIds } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        })
      : null;

  return {
    oficina,
    metricas: {
      usuarios: userIds.length,
      veiculos,
      clientes,
      ordens,
      ultimoAcesso: sessao?.updatedAt ?? null,
    },
    flags,
  };
}

/** Grava/atualiza uma feature flag da oficina; valor null remove o override. */
export async function salvarRecursoOficina(
  oficinaId: string,
  chave: string,
  valor: string | null
) {
  if (valor === null) {
    await prisma.recursoOficina.deleteMany({ where: { oficinaId, chave } });
    return;
  }
  await prisma.recursoOficina.upsert({
    where: { oficinaId_chave: { oficinaId, chave } },
    create: { oficinaId, chave, valor },
    update: { valor },
  });
}

// --- Administradores da plataforma -------------------------------------------

export async function listarAdministradores() {
  const admins = await prisma.plataformaAdmin.findMany({
    orderBy: { createdAt: "asc" },
  });
  const usuarios = await prisma.user.findMany({
    where: { id: { in: admins.map((a) => a.userId) } },
    select: { id: true, name: true, email: true },
  });
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  return admins.map((a) => ({
    id: a.id,
    userId: a.userId,
    nome: porId.get(a.userId)?.name ?? "(conta removida)",
    email: porId.get(a.userId)?.email ?? "—",
    desde: a.createdAt,
  }));
}

export async function adicionarSuperAdmin(email: string) {
  const usuario = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true },
  });
  if (!usuario) {
    throw new Error(
      "Nenhuma conta com este e-mail. Peça para a pessoa se cadastrar primeiro."
    );
  }
  const existe = await prisma.plataformaAdmin.findUnique({
    where: { userId: usuario.id },
  });
  if (existe) throw new Error("Esta conta já é administradora da plataforma.");
  return prisma.plataformaAdmin.create({ data: { userId: usuario.id } });
}

export async function removerSuperAdmin(userId: string, executorId: string) {
  if (userId === executorId) {
    throw new Error("Você não pode remover a si mesmo da administração.");
  }
  const total = await prisma.plataformaAdmin.count();
  if (total <= 1) {
    throw new Error("A plataforma precisa de ao menos um administrador.");
  }
  await prisma.plataformaAdmin.deleteMany({ where: { userId } });
}

// --- Planos ------------------------------------------------------------------

export async function listarPlanos() {
  return prisma.plano.findMany({
    orderBy: { precoMensal: "asc" },
    include: { recursos: true, _count: { select: { assinaturas: true } } },
  });
}

// --- Cobrança manual ---------------------------------------------------------

/** Cria a assinatura de uma oficina que ainda não tem plano (vence em 30 dias). */
export async function criarAssinatura(oficinaId: string, planoId: string) {
  const existe = await prisma.assinatura.findUnique({ where: { oficinaId } });
  if (existe) throw new Error("Esta oficina já possui assinatura.");
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 30);
  return prisma.assinatura.create({
    data: { oficinaId, planoId, status: "ATIVO", vencimento },
  });
}

export async function mudarStatusAssinatura(
  oficinaId: string,
  status: StatusAssinatura
) {
  return prisma.assinatura.update({ where: { oficinaId }, data: { status } });
}

/** Registra pagamento manual: status→ATIVO, vencimento +30 dias. */
export async function renovarAssinatura(oficinaId: string) {
  const atual = await prisma.assinatura.findUnique({ where: { oficinaId } });
  if (!atual) throw new Error("Assinatura não encontrada.");
  const base = atual.vencimento > new Date() ? atual.vencimento : new Date();
  const novoVencimento = new Date(base);
  novoVencimento.setDate(novoVencimento.getDate() + 30);
  return prisma.assinatura.update({
    where: { oficinaId },
    data: {
      status: "ATIVO",
      vencimento: novoVencimento,
      ultimoPagamentoEm: new Date(),
    },
  });
}

export async function definirVencimento(oficinaId: string, vencimento: Date) {
  return prisma.assinatura.update({ where: { oficinaId }, data: { vencimento } });
}

export async function trocarPlano(oficinaId: string, planoId: string) {
  return prisma.assinatura.update({ where: { oficinaId }, data: { planoId } });
}

// --- Uso vs limite -----------------------------------------------------------

export async function usoDaOficina(oficinaId: string) {
  const [usuarios, assinatura] = await Promise.all([
    prisma.member.count({ where: { organizationId: oficinaId } }),
    prisma.assinatura.findUnique({
      where: { oficinaId },
      select: { plano: { select: { recursos: true } } },
    }),
  ]);
  const limite = assinatura?.plano.recursos.find((r) => r.chave === "max_users");
  const maxUsers = limite ? Number(limite.valor) : null;
  return { usuarios, maxUsers };
}

function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}
