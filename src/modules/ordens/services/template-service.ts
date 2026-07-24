import "server-only";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";

export async function listarTemplates(db: TenantDb) {
  return db.templateServico.findMany({
    orderBy: { nome: "asc" },
    include: { itens: { where: { deletedAt: null } } },
  });
}

export interface ItemTemplateInput {
  tipo: "SERVICO" | "PECA";
  descricao: string;
  valor: number;
  quantidade: number;
  pecaId?: string | null;
}

export async function criarTemplate(
  db: TenantDb,
  oficinaId: string,
  dados: {
    nome: string;
    descricao?: string | null;
    tipoVeiculo?: "CARRO" | "MOTO" | null;
    itens: ItemTemplateInput[];
  }
) {
  return db.templateServico.create({
    data: {
      oficinaId,
      nome: dados.nome,
      descricao: dados.descricao ?? null,
      tipoVeiculo: dados.tipoVeiculo ?? null,
      itens: {
        create: dados.itens.map((i) => ({
          oficinaId,
          tipo: i.tipo,
          descricao: i.descricao,
          valor: i.valor,
          quantidade: i.quantidade,
          pecaId: i.pecaId ?? null,
        })),
      },
    },
  });
}

export async function excluirTemplate(db: TenantDb, id: string) {
  return db.templateServico.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Aplica um template numa OS: cria os serviços e peças do pacote como itens
 * da ordem. Retorna quantos itens foram inseridos.
 */
export async function aplicarTemplateNaOS(
  db: TenantDb,
  oficinaId: string,
  osId: string,
  templateId: string
): Promise<number> {
  const os = await db.ordemServico.findUnique({
    where: { id: osId },
    select: { id: true },
  });
  if (!os) throw new Error("OS não encontrada.");

  const template = await db.templateServico.findUnique({
    where: { id: templateId },
    include: { itens: { where: { deletedAt: null } } },
  });
  if (!template) throw new Error("Template não encontrado.");

  let inseridos = 0;
  for (const item of template.itens) {
    if (item.tipo === "SERVICO") {
      await db.oSServico.create({
        data: {
          oficinaId,
          ordemServicoId: osId,
          descricao: item.descricao,
          valor: paraNumero(item.valor),
        },
      });
    } else {
      await db.oSPeca.create({
        data: {
          oficinaId,
          ordemServicoId: osId,
          pecaId: item.pecaId ?? null,
          descricao: item.descricao,
          quantidade: paraNumero(item.quantidade),
          valorUnitario: paraNumero(item.valor),
        },
      });
    }
    inseridos += 1;
  }
  return inseridos;
}
