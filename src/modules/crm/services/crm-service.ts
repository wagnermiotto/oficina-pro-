import "server-only";
import { startOfDay } from "date-fns";
import type { TenantDb } from "@/shared/lib/tenant-db";
import type { InteracaoInput } from "../schemas/crm-schemas";

export async function listarLembretes(db: TenantDb) {
  return db.interacao.findMany({
    where: { proximoContato: { not: null } },
    orderBy: { proximoContato: "asc" },
    take: 100,
    include: {
      cliente: {
        select: { id: true, nome: true, telefone: true, whatsapp: true },
      },
    },
  });
}

export async function listarHistorico(db: TenantDb) {
  return db.interacao.findMany({
    orderBy: { dataContato: "desc" },
    take: 100,
    include: { cliente: { select: { id: true, nome: true } } },
  });
}

export async function criarInteracao(
  db: TenantDb,
  oficinaId: string,
  usuarioId: string,
  dados: InteracaoInput
) {
  return db.interacao.create({
    data: {
      oficinaId,
      clienteId: dados.clienteId,
      tipo: dados.tipo,
      mensagem: dados.mensagem,
      proximoContato: dados.proximoContato ?? null,
      usuarioId,
    },
  });
}

/** Marca o lembrete como tratado (remove o próximo contato). */
export async function concluirLembrete(db: TenantDb, id: string) {
  const interacao = await db.interacao.findUnique({ where: { id } });
  if (!interacao) throw new Error("Lembrete não encontrado.");
  return db.interacao.update({
    where: { id },
    data: { proximoContato: null },
  });
}

export async function listarGarantias(db: TenantDb) {
  const hoje = startOfDay(new Date());
  const garantias = await db.garantia.findMany({
    orderBy: { validadeAte: "asc" },
    take: 200,
    include: {
      ordemServico: {
        select: {
          id: true,
          numero: true,
          cliente: { select: { nome: true } },
          veiculo: { select: { placa: true, modelo: true } },
        },
      },
    },
  });
  return garantias.map((garantia) => ({
    ...garantia,
    vigente: garantia.validadeAte >= hoje,
    diasRestantes: Math.ceil(
      (garantia.validadeAte.getTime() - hoje.getTime()) / 86_400_000
    ),
  }));
}
