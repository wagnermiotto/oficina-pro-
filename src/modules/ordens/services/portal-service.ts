import "server-only";
import { randomBytes } from "node:crypto";
import type { StatusOS } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";

/** Progresso visual (0–100) por status, para a barra do portal. */
export const PROGRESSO_OS: Record<StatusOS, number> = {
  RECEBIDO: 10,
  DIAGNOSTICO: 25,
  AGUARDANDO_APROVACAO: 40,
  APROVADO: 55,
  EM_EXECUCAO: 70,
  AGUARDANDO_PECAS: 70,
  CONCLUIDO: 90,
  ENTREGUE: 100,
  FINALIZADO: 100,
  CANCELADO: 0,
};

/** Gera (ou reaproveita) o token permanente do portal do cliente da OS. */
export async function gerarPortalToken(db: TenantDb, osId: string) {
  const os = await db.ordemServico.findUnique({
    where: { id: osId },
    select: { id: true, portalToken: true },
  });
  if (!os) throw new Error("OS não encontrada.");
  if (os.portalToken) return os.portalToken;
  const token = randomBytes(18).toString("base64url");
  await db.ordemServico.update({ where: { id: osId }, data: { portalToken: token } });
  return token;
}

/**
 * Carrega a OS para a página PÚBLICA do portal (sem login), escopada pelo token.
 * Traz também o histórico de serviços do mesmo veículo.
 */
export async function obterPortalPorToken(token: string) {
  const os = await prisma.ordemServico.findUnique({
    where: { portalToken: token },
    include: {
      cliente: { select: { nome: true } },
      veiculo: { select: { id: true, marca: true, modelo: true, placa: true, ano: true } },
      servicosOS: { where: { deletedAt: null, status: { not: "RECUSADO" } }, orderBy: { createdAt: "asc" } },
      pecasOS: { where: { deletedAt: null, status: { not: "RECUSADO" } }, orderBy: { createdAt: "asc" } },
      diagnostico: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      garantias: { where: { deletedAt: null } },
      oficina: { select: { name: true, config: true } },
    },
  });
  if (!os) return null;

  const historico = await prisma.ordemServico.findMany({
    where: {
      veiculoId: os.veiculoId,
      id: { not: os.id },
      status: { in: ["ENTREGUE", "FINALIZADO"] },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, numero: true, dataConclusao: true, createdAt: true, total: true },
  });

  return { os, historico };
}
