import "server-only";
import type { Prisma } from "@prisma/client";
import type { TenantDb } from "@/shared/lib/tenant-db";
import type { ClienteInput } from "../schemas/cliente-schemas";

export const POR_PAGINA = 20;

export async function listarClientes(
  db: TenantDb,
  { busca, pagina }: { busca?: string; pagina: number }
) {
  const where: Prisma.ClienteWhereInput = busca
    ? {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { cpfCnpj: { contains: busca.replace(/\D/g, "") || busca } },
          { telefone: { contains: busca } },
          { email: { contains: busca, mode: "insensitive" } },
        ],
      }
    : {};

  const [itens, total] = await Promise.all([
    db.cliente.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { _count: { select: { veiculos: true, ordens: true } } },
    }),
    db.cliente.count({ where }),
  ]);

  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function obterCliente(db: TenantDb, id: string) {
  return db.cliente.findUnique({
    where: { id },
    include: {
      veiculos: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      ordens: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { veiculo: { select: { placa: true, modelo: true } } },
      },
      _count: { select: { veiculos: true, ordens: true } },
    },
  });
}

export async function criarCliente(db: TenantDb, dados: ClienteInput) {
  return db.cliente.create({ data: { ...dados, oficinaId: "" } });
}

export async function atualizarCliente(
  db: TenantDb,
  id: string,
  dados: ClienteInput
) {
  return db.cliente.update({ where: { id }, data: dados });
}

export async function excluirCliente(db: TenantDb, id: string) {
  const emUso = await db.ordemServico.count({
    where: {
      clienteId: id,
      status: { notIn: ["FINALIZADO", "ENTREGUE", "CANCELADO"] },
    },
  });
  if (emUso > 0) {
    throw new Error(
      "Este cliente possui ordens de serviço em andamento e não pode ser excluído."
    );
  }
  return db.cliente.update({ where: { id }, data: { deletedAt: new Date() } });
}
