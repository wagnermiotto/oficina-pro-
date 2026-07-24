import "server-only";
import type { Prisma, StatusAssinatura } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { paraNumero } from "@/shared/utils/moeda";

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
  const [assinaturas, planos, novas30, novas90] = await Promise.all([
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
