import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";

/** Status da OS em que faz sentido pedir avaliação (serviço entregue). */
const STATUS_ELEGIVEL = ["CONCLUIDO", "ENTREGUE", "FINALIZADO"] as const;

/**
 * Gera (ou reaproveita) o link público de pesquisa de satisfação de uma OS.
 * Se já existe uma pesquisa não respondida, devolve a mesma — evita links soltos.
 */
export async function criarPesquisaNps(
  db: TenantDb,
  oficinaId: string,
  osId: string
) {
  const os = await db.ordemServico.findUnique({
    where: { id: osId },
    select: { id: true, status: true, clienteId: true },
  });
  if (!os) throw new Error("OS não encontrada.");
  if (!STATUS_ELEGIVEL.includes(os.status as (typeof STATUS_ELEGIVEL)[number])) {
    throw new Error(
      "A pesquisa só pode ser enviada após o serviço concluído/entregue."
    );
  }

  const existente = await db.pesquisaNps.findFirst({
    where: { ordemServicoId: osId, respondidoEm: null },
  });
  if (existente) return existente;

  return db.pesquisaNps.create({
    data: {
      oficinaId,
      ordemServicoId: osId,
      clienteId: os.clienteId,
      token: randomBytes(24).toString("base64url"),
    },
  });
}

/**
 * Carrega a pesquisa para a página PÚBLICA (sem login), escopada pelo token.
 */
export async function obterPesquisaPorToken(token: string) {
  return prisma.pesquisaNps.findUnique({
    where: { token },
    include: {
      ordemServico: { select: { numero: true } },
      cliente: { select: { nome: true } },
      oficina: { select: { name: true, config: true } },
    },
  });
}

export interface RespostaNps {
  nota: number;
  comentario?: string | null;
  ip?: string | null;
}

/** Registra a nota do cliente (página pública, uso único). */
export async function responderNps(token: string, resposta: RespostaNps) {
  const pesquisa = await prisma.pesquisaNps.findUnique({ where: { token } });
  if (!pesquisa) throw new Error("Link de pesquisa inválido.");
  if (pesquisa.respondidoEm) throw new Error("Esta pesquisa já foi respondida.");
  if (!Number.isInteger(resposta.nota) || resposta.nota < 0 || resposta.nota > 10) {
    throw new Error("Escolha uma nota de 0 a 10.");
  }

  await prisma.pesquisaNps.update({
    where: { id: pesquisa.id },
    data: {
      nota: resposta.nota,
      comentario: resposta.comentario?.trim() || null,
      ipRespondente: resposta.ip ?? null,
      respondidoEm: new Date(),
    },
  });
}

export interface ResumoNps {
  totalRespostas: number;
  score: number | null; // -100 a 100 (promotores% − detratores%)
  media: number | null;
  promotores: number;
  neutros: number;
  detratores: number;
  pendentes: number;
}

/** Métrica NPS: promotores (9-10) − detratores (0-6), em pontos percentuais. */
export async function resumoNps(db: TenantDb): Promise<ResumoNps> {
  const [respondidas, pendentes] = await Promise.all([
    db.pesquisaNps.findMany({
      where: { respondidoEm: { not: null } },
      select: { nota: true },
    }),
    db.pesquisaNps.count({ where: { respondidoEm: null } }),
  ]);

  const total = respondidas.length;
  if (total === 0) {
    return {
      totalRespostas: 0,
      score: null,
      media: null,
      promotores: 0,
      neutros: 0,
      detratores: 0,
      pendentes,
    };
  }

  let promotores = 0;
  let neutros = 0;
  let detratores = 0;
  let soma = 0;
  for (const r of respondidas) {
    const nota = r.nota ?? 0;
    soma += nota;
    if (nota >= 9) promotores += 1;
    else if (nota >= 7) neutros += 1;
    else detratores += 1;
  }

  const score = Math.round(((promotores - detratores) / total) * 100);
  const media = Math.round((soma / total) * 10) / 10;
  return { totalRespostas: total, score, media, promotores, neutros, detratores, pendentes };
}

export async function listarRespostasNps(db: TenantDb, limite = 50) {
  return db.pesquisaNps.findMany({
    where: { respondidoEm: { not: null } },
    orderBy: { respondidoEm: "desc" },
    take: limite,
    include: {
      cliente: { select: { nome: true } },
      ordemServico: { select: { id: true, numero: true } },
    },
  });
}
