import "server-only";
import type { StatusChecklist, TipoVeiculo } from "@prisma/client";
import type { TenantDb } from "@/shared/lib/tenant-db";

/** Itens padrão da inspeção digital (DVI) por tipo de veículo. */
export const ITENS_CHECKLIST_PADRAO: Record<TipoVeiculo, string[]> = {
  CARRO: [
    "Freios (pastilhas e discos)",
    "Pneus e calibragem",
    "Suspensão e amortecedores",
    "Óleo do motor e filtro",
    "Filtro de ar",
    "Bateria e alternador",
    "Luzes, setas e faróis",
    "Sistema de arrefecimento",
    "Correias e mangueiras",
    "Escapamento",
    "Palhetas e para-brisa",
    "Níveis de fluidos (freio, direção, arrefecimento)",
  ],
  MOTO: [
    "Freios (pastilhas e discos)",
    "Pneus e calibragem",
    "Corrente, coroa e pinhão",
    "Óleo do motor",
    "Bateria",
    "Luzes e setas",
    "Suspensão",
    "Comandos, cabos e manetes",
  ],
};

/**
 * Gera o checklist de inspeção da OS a partir do tipo do veículo.
 * Idempotente: se a OS já tem itens ativos, devolve os existentes.
 */
export async function criarChecklist(
  db: TenantDb,
  oficinaId: string,
  osId: string
) {
  const existentes = await db.checklistOS.count({
    where: { ordemServicoId: osId },
  });
  if (existentes > 0) return listarChecklist(db, osId);

  const os = await db.ordemServico.findUnique({
    where: { id: osId },
    select: { veiculo: { select: { tipo: true } } },
  });
  if (!os) throw new Error("OS não encontrada.");

  const itens = ITENS_CHECKLIST_PADRAO[os.veiculo.tipo];
  await db.checklistOS.createMany({
    data: itens.map((item, i) => ({
      oficinaId,
      ordemServicoId: osId,
      item,
      ordem: i,
    })),
  });
  return listarChecklist(db, osId);
}

export async function listarChecklist(db: TenantDb, osId: string) {
  return db.checklistOS.findMany({
    where: { ordemServicoId: osId },
    orderBy: { ordem: "asc" },
  });
}

export async function atualizarItemChecklist(
  db: TenantDb,
  itemId: string,
  status: StatusChecklist,
  observacao?: string | null
) {
  return db.checklistOS.update({
    where: { id: itemId },
    data: { status, observacao: observacao?.trim() || null },
  });
}
