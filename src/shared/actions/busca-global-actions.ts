"use server";

import { requireOficina } from "@/shared/lib/session";
import { formatarPlaca, normalizarPlaca } from "@/shared/utils/placa";

export interface ResultadoBusca {
  tipo: "cliente" | "veiculo" | "ordem";
  id: string;
  titulo: string;
  subtitulo: string;
  href: string;
}

const LIMITE_POR_TIPO = 6;

/**
 * Busca global (Ctrl+K): clientes, veículos e ordens de serviço da oficina
 * ativa. Escopada pelo tenantDb — nunca cruza oficinas.
 */
export async function buscaGlobal(termo: string): Promise<ResultadoBusca[]> {
  const busca = termo.trim();
  if (busca.length < 2) return [];

  const { db } = await requireOficina();
  const numero = Number(busca.replace(/\D/g, ""));

  const [clientes, veiculos, ordens] = await Promise.all([
    db.cliente.findMany({
      where: {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { cpfCnpj: { contains: busca } },
          { telefone: { contains: busca } },
        ],
      },
      take: LIMITE_POR_TIPO,
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cpfCnpj: true, cidade: true },
    }),
    db.veiculo.findMany({
      where: {
        OR: [
          { placa: { contains: normalizarPlaca(busca) } },
          { marca: { contains: busca, mode: "insensitive" } },
          { modelo: { contains: busca, mode: "insensitive" } },
          { cliente: { nome: { contains: busca, mode: "insensitive" } } },
        ],
      },
      take: LIMITE_POR_TIPO,
      orderBy: { placa: "asc" },
      select: {
        id: true,
        placa: true,
        marca: true,
        modelo: true,
        cliente: { select: { nome: true } },
      },
    }),
    db.ordemServico.findMany({
      where: {
        OR: [
          ...(Number.isFinite(numero) && numero > 0 ? [{ numero }] : []),
          { cliente: { nome: { contains: busca, mode: "insensitive" } } },
          { veiculo: { placa: { contains: normalizarPlaca(busca) } } },
        ],
      },
      take: LIMITE_POR_TIPO,
      orderBy: { numero: "desc" },
      select: {
        id: true,
        numero: true,
        status: true,
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true } },
      },
    }),
  ]);

  return [
    ...ordens.map((o) => ({
      tipo: "ordem" as const,
      id: o.id,
      titulo: `OS #${String(o.numero).padStart(4, "0")}`,
      subtitulo: `${o.cliente.nome} · ${formatarPlaca(o.veiculo.placa)}`,
      href: `/ordens/${o.id}`,
    })),
    ...clientes.map((c) => ({
      tipo: "cliente" as const,
      id: c.id,
      titulo: c.nome,
      subtitulo: [c.cpfCnpj, c.cidade].filter(Boolean).join(" · ") || "Cliente",
      href: `/clientes/${c.id}`,
    })),
    ...veiculos.map((v) => ({
      tipo: "veiculo" as const,
      id: v.id,
      titulo: `${formatarPlaca(v.placa)} — ${[v.marca, v.modelo].filter(Boolean).join(" ") || "Veículo"}`,
      subtitulo: v.cliente?.nome ?? "Sem proprietário",
      href: `/veiculos/${v.id}`,
    })),
  ];
}
