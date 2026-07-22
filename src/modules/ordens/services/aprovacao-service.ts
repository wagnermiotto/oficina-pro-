import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/shared/lib/prisma";
import type { TenantDb } from "@/shared/lib/tenant-db";
import { storage } from "@/shared/lib/storage";

const DIAS_VALIDADE_PADRAO = 7;

/** Gera (ou renova) o link público de aprovação do orçamento. */
export async function criarAprovacao(
  db: TenantDb,
  oficinaId: string,
  osId: string,
  diasValidade = DIAS_VALIDADE_PADRAO
) {
  const os = await db.ordemServico.findUnique({
    where: { id: osId },
    select: { id: true, status: true },
  });
  if (!os) throw new Error("OS não encontrada.");

  // Invalida links pendentes anteriores.
  await db.aprovacao.updateMany({
    where: { ordemServicoId: osId, status: "PENDENTE" },
    data: { status: "EXPIRADA" },
  });

  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + diasValidade);

  const aprovacao = await db.aprovacao.create({
    data: {
      oficinaId,
      ordemServicoId: osId,
      token: randomBytes(24).toString("base64url"),
      expiraEm,
    },
  });
  return aprovacao;
}

/**
 * Carrega o orçamento para a página PÚBLICA de aprovação (sem login).
 * Usa o prisma direto, escopado pelo token — único ponto de entrada público.
 */
export async function obterOrcamentoPorToken(token: string) {
  const aprovacao = await prisma.aprovacao.findUnique({
    where: { token },
    include: {
      ordemServico: {
        include: {
          cliente: { select: { nome: true } },
          veiculo: {
            select: { marca: true, modelo: true, placa: true, ano: true },
          },
          servicosOS: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
          },
          pecasOS: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
          diagnostico: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        },
      },
      oficina: {
        select: { name: true, config: true },
      },
    },
  });
  if (!aprovacao) return null;
  const expirada =
    aprovacao.status === "PENDENTE" && aprovacao.expiraEm < new Date();
  return { aprovacao, expirada };
}

export interface DecisaoItem {
  tipo: "servico" | "peca";
  id: string;
  aprovado: boolean;
}

export interface RespostaAprovacao {
  nome: string;
  decisoes: DecisaoItem[];
  assinaturaUrl?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Registra a resposta do cliente (página pública). Atualiza o status de cada
 * item, o status da aprovação e move a OS para APROVADO (ou de volta para
 * DIAGNOSTICO quando tudo foi recusado). Recalcula os totais.
 */
export async function responderAprovacao(
  token: string,
  resposta: RespostaAprovacao
) {
  const aprovacao = await prisma.aprovacao.findUnique({
    where: { token },
    include: {
      ordemServico: {
        include: {
          servicosOS: { where: { deletedAt: null } },
          pecasOS: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!aprovacao) throw new Error("Link de aprovação inválido.");
  if (aprovacao.status !== "PENDENTE") {
    throw new Error("Este orçamento já foi respondido.");
  }
  if (aprovacao.expiraEm < new Date()) {
    await prisma.aprovacao.update({
      where: { id: aprovacao.id },
      data: { status: "EXPIRADA" },
    });
    throw new Error("Este link de aprovação expirou. Solicite um novo à oficina.");
  }

  const os = aprovacao.ordemServico;
  const oficinaId = aprovacao.oficinaId;

  // Assinatura desenhada no canvas da página pública (opcional).
  let assinaturaUrl: string | null = null;
  const match = resposta.assinaturaUrl
    ? /^data:image\/png;base64,(.+)$/.exec(resposta.assinaturaUrl)
    : null;
  if (match) {
    const buffer = Buffer.from(match[1]!, "base64");
    if (buffer.length <= 2 * 1024 * 1024) {
      const salvo = await storage.salvar(
        `${oficinaId}/aprovacoes/${aprovacao.id}/assinatura.png`,
        buffer,
        "image/png"
      );
      assinaturaUrl = salvo.url;
    }
  }

  const idsServicos = new Set(os.servicosOS.map((s) => s.id));
  const idsPecas = new Set(os.pecasOS.map((p) => p.id));
  const decisoesValidas = resposta.decisoes.filter((d) =>
    d.tipo === "servico" ? idsServicos.has(d.id) : idsPecas.has(d.id)
  );

  const aprovados = decisoesValidas.filter((d) => d.aprovado).length;
  const statusAprovacao =
    aprovados === 0
      ? "RECUSADA"
      : aprovados === decisoesValidas.length
        ? "APROVADA"
        : "PARCIAL";

  await prisma.$transaction(async (tx) => {
    for (const decisao of decisoesValidas) {
      const dados = { status: decisao.aprovado ? "APROVADO" : "RECUSADO" } as const;
      if (decisao.tipo === "servico") {
        await tx.oSServico.update({ where: { id: decisao.id, oficinaId }, data: dados });
      } else {
        await tx.oSPeca.update({ where: { id: decisao.id, oficinaId }, data: dados });
      }
    }
    await tx.aprovacao.update({
      where: { id: aprovacao.id },
      data: {
        status: statusAprovacao,
        nomeAprovador: resposta.nome,
        ipAprovador: resposta.ip ?? null,
        userAgent: resposta.userAgent ?? null,
        assinaturaUrl,
        respondidoEm: new Date(),
      },
    });
    const novoStatusOS = aprovados > 0 ? "APROVADO" : "DIAGNOSTICO";
    if (os.status === "AGUARDANDO_APROVACAO") {
      await tx.ordemServico.update({
        where: { id: os.id, oficinaId },
        data: { status: novoStatusOS },
      });
      await tx.oSHistorico.create({
        data: {
          oficinaId,
          ordemServicoId: os.id,
          statusAnterior: "AGUARDANDO_APROVACAO",
          statusNovo: novoStatusOS,
          observacao:
            statusAprovacao === "APROVADA"
              ? `Orçamento aprovado integralmente por ${resposta.nome}.`
              : statusAprovacao === "PARCIAL"
                ? `Orçamento aprovado parcialmente por ${resposta.nome} (${aprovados}/${decisoesValidas.length} itens).`
                : `Orçamento recusado por ${resposta.nome}.`,
        },
      });
    }

    // Recalcula totais dentro da mesma transação (sem itens recusados).
    const [servicos, pecas, osAtual] = await Promise.all([
      tx.oSServico.findMany({ where: { ordemServicoId: os.id, deletedAt: null } }),
      tx.oSPeca.findMany({ where: { ordemServicoId: os.id, deletedAt: null } }),
      tx.ordemServico.findUniqueOrThrow({ where: { id: os.id } }),
    ]);
    const { calcularTotaisOS } = await import("./os-regras");
    const { paraNumero } = await import("@/shared/utils/moeda");
    const totais = calcularTotaisOS(
      servicos.map((s) => ({
        valor: paraNumero(s.valor),
        recusado: s.status === "RECUSADO",
      })),
      pecas.map((p) => ({
        quantidade: paraNumero(p.quantidade),
        valorUnitario: paraNumero(p.valorUnitario),
        recusado: p.status === "RECUSADO",
      })),
      paraNumero(osAtual.descontoValor),
      paraNumero(osAtual.impostoPercent)
    );
    await tx.ordemServico.update({
      where: { id: os.id },
      data: {
        totalServicos: totais.totalServicos,
        totalPecas: totais.totalPecas,
        total: totais.total,
      },
    });
  });

  return { statusAprovacao, aprovados, totalItens: decisoesValidas.length };
}
