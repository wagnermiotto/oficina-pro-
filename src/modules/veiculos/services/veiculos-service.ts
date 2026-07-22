import "server-only";
import type { Prisma } from "@prisma/client";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { normalizarPlaca } from "@/shared/utils/placa";
import type { VeiculoInput } from "../schemas/veiculo-schemas";

export const POR_PAGINA = 20;

export async function listarVeiculos(
  db: TenantDb,
  { busca, pagina, clienteId }: { busca?: string; pagina: number; clienteId?: string }
) {
  const where: Prisma.VeiculoWhereInput = {
    ...(clienteId ? { clienteId } : {}),
    ...(busca
      ? {
          OR: [
            { placa: { contains: normalizarPlaca(busca) } },
            { marca: { contains: busca, mode: "insensitive" } },
            { modelo: { contains: busca, mode: "insensitive" } },
            { cliente: { nome: { contains: busca, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [itens, total] = await Promise.all([
    db.veiculo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        cliente: { select: { id: true, nome: true } },
        _count: { select: { ordens: true, checkIns: true } },
      },
    }),
    db.veiculo.count({ where }),
  ]);

  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function obterVeiculo(db: TenantDb, id: string) {
  return db.veiculo.findUnique({
    where: { id },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true, whatsapp: true } },
      checkIns: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { avarias: { where: { deletedAt: null } } },
      },
      ordens: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function criarVeiculo(db: TenantDb, dados: VeiculoInput) {
  const existente = await db.veiculo.findFirst({
    where: { placa: dados.placa },
    select: { id: true },
  });
  if (existente) {
    throw new Error(`Já existe um veículo com a placa ${dados.placa}.`);
  }
  return db.veiculo.create({ data: { ...dados, oficinaId: "" } });
}

export async function atualizarVeiculo(
  db: TenantDb,
  id: string,
  dados: VeiculoInput
) {
  const duplicada = await db.veiculo.findFirst({
    where: { placa: dados.placa, id: { not: id } },
    select: { id: true },
  });
  if (duplicada) {
    throw new Error(`Já existe outro veículo com a placa ${dados.placa}.`);
  }
  return db.veiculo.update({ where: { id }, data: dados });
}

export async function excluirVeiculo(db: TenantDb, id: string) {
  const emUso = await db.ordemServico.count({
    where: {
      veiculoId: id,
      status: { notIn: ["FINALIZADO", "ENTREGUE", "CANCELADO"] },
    },
  });
  if (emUso > 0) {
    throw new Error(
      "Este veículo possui ordens de serviço em andamento e não pode ser excluído."
    );
  }
  return db.veiculo.update({ where: { id }, data: { deletedAt: new Date() } });
}

/** Lista enxuta para selects/comboboxes. */
export async function listarClientesParaSelecao(db: TenantDb) {
  return db.cliente.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, cpfCnpj: true },
    take: 500,
  });
}
