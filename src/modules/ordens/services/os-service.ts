import "server-only";
import type { Prisma, StatusOS } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import {
  calcularTotaisOS,
  transicaoValida,
  TransicaoInvalidaError,
} from "./os-regras";

export const POR_PAGINA = 20;

export async function listarOS(
  db: TenantDb,
  {
    busca,
    status,
    pagina,
    mecanicoId,
  }: { busca?: string; status?: StatusOS; pagina: number; mecanicoId?: string }
) {
  const where: Prisma.OrdemServicoWhereInput = {
    ...(status ? { status } : {}),
    // Escopo "minhas OS" do RBAC (perfil Mecânico padrão).
    ...(mecanicoId ? { mecanicoId } : {}),
    ...(busca
      ? {
          OR: [
            ...(Number.isInteger(Number(busca))
              ? [{ numero: Number(busca) }]
              : []),
            { cliente: { nome: { contains: busca, mode: "insensitive" as const } } },
            { veiculo: { placa: { contains: busca.toUpperCase() } } },
            { descricaoProblema: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [itens, total] = await Promise.all([
    db.ordemServico.findMany({
      where,
      orderBy: { numero: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        cliente: { select: { nome: true } },
        veiculo: { select: { placa: true, marca: true, modelo: true } },
      },
    }),
    db.ordemServico.count({ where }),
  ]);

  return { itens, total, totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function obterOS(db: TenantDb, id: string) {
  return db.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: true,
      veiculo: true,
      checkIn: { include: { avarias: { where: { deletedAt: null } } } },
      servicosOS: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { servico: { select: { nome: true } } },
      },
      pecasOS: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { peca: { select: { nome: true, quantidade: true, unidade: true } } },
      },
      diagnostico: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      historicos: { orderBy: { createdAt: "desc" } },
      aprovacoes: { orderBy: { createdAt: "desc" } },
      garantias: { where: { deletedAt: null } },
    },
  });
}

export interface NovaOSDados {
  clienteId: string;
  veiculoId: string;
  mecanicoId?: string | undefined;
  descricaoProblema?: string | undefined;
  dataPrevista?: Date | undefined;
  garantiaDias?: number | undefined;
}

/** Cria a OS com numeração sequencial por oficina (atômica). */
export async function criarOS(
  db: TenantDb,
  oficinaId: string,
  usuarioId: string,
  dados: NovaOSDados
) {
  const veiculo = await db.veiculo.findUnique({
    where: { id: dados.veiculoId },
    select: { id: true, clienteId: true },
  });
  if (!veiculo || veiculo.clienteId !== dados.clienteId) {
    throw new Error("Veículo não pertence ao cliente selecionado.");
  }

  const config = await prisma.oficinaConfig.update({
    where: { oficinaId },
    data: { proximoNumeroOS: { increment: 1 } },
  });
  const numero = config.proximoNumeroOS - 1;

  const os = await db.ordemServico.create({
    data: {
      oficinaId,
      numero,
      clienteId: dados.clienteId,
      veiculoId: dados.veiculoId,
      mecanicoId: dados.mecanicoId ?? null,
      descricaoProblema: dados.descricaoProblema ?? null,
      dataPrevista: dados.dataPrevista ?? null,
      garantiaDias: dados.garantiaDias ?? config.garantiaPadraoDias,
      historicos: {
        create: {
          oficinaId,
          statusNovo: "RECEBIDO",
          usuarioId,
          observacao: "Ordem de serviço criada.",
        },
      },
    },
  });
  return os;
}

/** Recalcula e persiste os totais da OS a partir dos itens ativos. */
export async function recalcularTotais(db: TenantDb, osId: string) {
  const os = await db.ordemServico.findUnique({
    where: { id: osId },
    include: {
      servicosOS: { where: { deletedAt: null } },
      pecasOS: { where: { deletedAt: null } },
    },
  });
  if (!os) throw new Error("OS não encontrada.");

  const totais = calcularTotaisOS(
    os.servicosOS.map((s) => ({
      valor: paraNumero(s.valor),
      recusado: s.status === "RECUSADO",
    })),
    os.pecasOS.map((p) => ({
      quantidade: paraNumero(p.quantidade),
      valorUnitario: paraNumero(p.valorUnitario),
      recusado: p.status === "RECUSADO",
    })),
    paraNumero(os.descontoValor),
    paraNumero(os.impostoPercent)
  );

  await db.ordemServico.update({
    where: { id: osId },
    data: {
      totalServicos: totais.totalServicos,
      totalPecas: totais.totalPecas,
      total: totais.total,
    },
  });
  return totais;
}

/**
 * Muda o status da OS validando a transição e aplicando efeitos colaterais:
 * baixa de estoque, datas, financeiro, garantia e comissão.
 */
export async function mudarStatus(
  db: TenantDb,
  oficinaId: string,
  osId: string,
  novoStatus: StatusOS,
  usuarioId: string,
  observacao?: string
) {
  const os = await db.ordemServico.findUnique({
    where: { id: osId },
    include: {
      pecasOS: { where: { deletedAt: null } },
      cliente: { select: { id: true, nome: true } },
    },
  });
  if (!os) throw new Error("OS não encontrada.");
  if (!transicaoValida(os.status, novoStatus)) {
    throw new TransicaoInvalidaError(os.status, novoStatus);
  }

  const agora = new Date();
  const dadosUpdate: Prisma.OrdemServicoUpdateInput = { status: novoStatus };
  if (novoStatus === "CONCLUIDO") dadosUpdate.dataConclusao = agora;
  if (novoStatus === "ENTREGUE") dadosUpdate.dataEntrega = agora;

  // Baixa de estoque ao iniciar a execução (peças aprovadas/pendentes com vínculo).
  if (novoStatus === "EM_EXECUCAO") {
    const pecasParaBaixa = os.pecasOS.filter(
      (p) => p.pecaId && !p.baixaEfetuada && p.status !== "RECUSADO"
    );
    if (pecasParaBaixa.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const item of pecasParaBaixa) {
          await tx.peca.update({
            where: { id: item.pecaId!, oficinaId },
            data: { quantidade: { decrement: item.quantidade } },
          });
          await tx.movimentacaoEstoque.create({
            data: {
              oficinaId,
              pecaId: item.pecaId!,
              tipo: "SAIDA",
              quantidade: item.quantidade,
              motivo: `Uso na OS #${os.numero}`,
              ordemServicoId: os.id,
              usuarioId,
            },
          });
          await tx.oSPeca.update({
            where: { id: item.id, oficinaId },
            data: { baixaEfetuada: true },
          });
        }
      });
    }
  }

  // Finalização: contas a receber + garantia + comissão do mecânico.
  if (novoStatus === "FINALIZADO") {
    const total = paraNumero(os.total);
    if (total > 0) {
      await db.lancamentoFinanceiro.create({
        data: {
          oficinaId,
          tipo: "RECEITA",
          descricao: `OS #${String(os.numero).padStart(4, "0")} — ${os.cliente.nome}`,
          valor: total,
          status: "PENDENTE",
          vencimento: agora,
          ordemServicoId: os.id,
          clienteId: os.clienteId,
        },
      });
    }
    if (os.garantiaDias > 0) {
      const validade = new Date(agora);
      validade.setDate(validade.getDate() + os.garantiaDias);
      await db.garantia.create({
        data: {
          oficinaId,
          ordemServicoId: os.id,
          tipo: "SERVICO",
          descricao: `Garantia de ${os.garantiaDias} dias — OS #${String(os.numero).padStart(4, "0")}`,
          validadeAte: validade,
        },
      });
    }
    if (os.mecanicoId) {
      const perfil = await db.funcionarioPerfil.findFirst({
        where: { userId: os.mecanicoId, ativo: true },
      });
      const percentual = paraNumero(perfil?.comissaoPercent);
      if (percentual > 0) {
        const valorComissao =
          Math.round(paraNumero(os.totalServicos) * percentual) / 100;
        await db.comissao.create({
          data: {
            oficinaId,
            usuarioId: os.mecanicoId,
            ordemServicoId: os.id,
            percentual,
            valor: valorComissao,
            status: "PENDENTE",
          },
        });
      }
    }
  }

  const atualizada = await db.ordemServico.update({
    where: { id: osId },
    data: dadosUpdate,
  });
  await db.oSHistorico.create({
    data: {
      oficinaId,
      ordemServicoId: osId,
      statusAnterior: os.status,
      statusNovo: novoStatus,
      usuarioId,
      observacao: observacao ?? null,
    },
  });
  return atualizada;
}

/** Lista mecânicos (perfis ativos) com nome do usuário resolvido. */
export async function listarMecanicos(db: TenantDb) {
  const perfis = await db.funcionarioPerfil.findMany({
    where: { ativo: true },
    select: { userId: true, cargo: true, especialidade: true },
  });
  if (perfis.length === 0) return [];
  const usuarios = await prisma.user.findMany({
    where: { id: { in: perfis.map((p) => p.userId) } },
    select: { id: true, name: true },
  });
  const nomes = new Map(usuarios.map((u) => [u.id, u.name]));
  return perfis.map((p) => ({
    userId: p.userId,
    nome: nomes.get(p.userId) ?? "Usuário",
    cargo: p.cargo,
    especialidade: p.especialidade,
  }));
}
