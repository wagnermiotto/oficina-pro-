import "server-only";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";

export const POR_PAGINA = 20;

export async function listarContagens(db: TenantDb, { pagina }: { pagina: number }) {
  const [itens, total] = await Promise.all([
    db.contagemEstoque.findMany({
      orderBy: { numero: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        categoria: { select: { nome: true } },
        _count: { select: { itens: true } },
      },
    }),
    db.contagemEstoque.count(),
  ]);
  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function obterContagem(db: TenantDb, id: string) {
  return db.contagemEstoque.findUnique({
    where: { id },
    include: {
      categoria: { select: { nome: true } },
      itens: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { peca: { select: { nome: true, codigo: true, unidade: true } } },
      },
    },
  });
}

/**
 * Abre uma contagem congelando o saldo do sistema de cada peça ativa
 * (da categoria, se informada) no momento da criação.
 */
export async function criarContagem(
  db: TenantDb,
  oficinaId: string,
  usuarioId: string,
  dados: { categoriaId?: string; observacoes?: string }
) {
  const pecas = await db.peca.findMany({
    where: {
      ativo: true,
      ...(dados.categoriaId ? { categoriaId: dados.categoriaId } : {}),
    },
    select: { id: true, quantidade: true },
    orderBy: { nome: "asc" },
  });
  if (pecas.length === 0) {
    throw new Error("Nenhuma peça ativa para contar nesse filtro.");
  }

  const config = await prisma.oficinaConfig.update({
    where: { oficinaId },
    data: { proximoNumeroContagem: { increment: 1 } },
  });
  const numero = config.proximoNumeroContagem - 1;

  return db.contagemEstoque.create({
    data: {
      oficinaId,
      numero,
      categoriaId: dados.categoriaId ?? null,
      observacoes: dados.observacoes ?? null,
      usuarioId,
      itens: {
        create: pecas.map((p) => ({
          oficinaId,
          pecaId: p.id,
          saldoSistema: p.quantidade,
        })),
      },
    },
  });
}

/** Grava contagens parciais (só itens da contagem informada, ainda aberta). */
export async function salvarContagens(
  db: TenantDb,
  contagemId: string,
  itens: { itemId: string; saldoContado: number | null }[]
) {
  const contagem = await db.contagemEstoque.findUnique({
    where: { id: contagemId },
    select: { status: true },
  });
  if (!contagem) throw new Error("Contagem não encontrada.");
  if (contagem.status !== "ABERTA") {
    throw new Error("Só é possível alterar contagens abertas.");
  }

  for (const item of itens) {
    await db.contagemItem.update({
      where: { id: item.itemId, contagemId },
      data: { saldoContado: item.saldoContado },
    });
  }
}

/**
 * Conclui a contagem: para cada item contado com divergência em relação ao
 * saldo ATUAL da peça, ajusta o saldo e registra movimentação AJUSTE — mesma
 * trilha de auditoria das movimentações manuais.
 */
export async function concluirContagem(
  db: TenantDb,
  oficinaId: string,
  usuarioId: string,
  contagemId: string
) {
  const contagem = await obterContagem(db, contagemId);
  if (!contagem) throw new Error("Contagem não encontrada.");
  if (contagem.status !== "ABERTA") {
    throw new Error("Contagem já concluída ou cancelada.");
  }

  const contados = contagem.itens.filter((i) => i.saldoContado !== null);
  if (contados.length === 0) {
    throw new Error("Nenhum item contado — preencha ao menos um saldo.");
  }

  let ajustes = 0;
  await prisma.$transaction(async (tx) => {
    for (const item of contados) {
      const peca = await tx.peca.findFirst({
        where: { id: item.pecaId, oficinaId },
        select: { quantidade: true },
      });
      if (!peca) continue;
      const saldoAtual = paraNumero(peca.quantidade);
      const contado = paraNumero(item.saldoContado);
      const delta = Math.round((contado - saldoAtual) * 1000) / 1000;
      if (delta === 0) continue;

      await tx.peca.update({
        where: { id: item.pecaId, oficinaId },
        data: { quantidade: contado },
      });
      await tx.movimentacaoEstoque.create({
        data: {
          oficinaId,
          pecaId: item.pecaId,
          tipo: "AJUSTE",
          quantidade: delta,
          motivo: `Contagem cíclica #${String(contagem.numero).padStart(3, "0")}`,
          usuarioId,
        },
      });
      ajustes += 1;
    }

    await tx.contagemEstoque.update({
      where: { id: contagemId, oficinaId },
      data: { status: "CONCLUIDA", concluidaEm: new Date() },
    });
  });

  return { ajustes, contados: contados.length };
}

export async function cancelarContagem(db: TenantDb, contagemId: string) {
  const contagem = await db.contagemEstoque.findUnique({
    where: { id: contagemId },
    select: { status: true },
  });
  if (!contagem) throw new Error("Contagem não encontrada.");
  if (contagem.status !== "ABERTA") {
    throw new Error("Só é possível cancelar contagens abertas.");
  }
  return db.contagemEstoque.update({
    where: { id: contagemId },
    data: { status: "CANCELADA" },
  });
}
