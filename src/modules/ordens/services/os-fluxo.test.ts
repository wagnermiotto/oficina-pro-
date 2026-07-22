import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import { criarOS, mudarStatus, recalcularTotais } from "./os-service";
import { criarAprovacao, responderAprovacao } from "./aprovacao-service";

/**
 * Teste de integração do fluxo completo da OS (banco real):
 * criação → itens → aprovação pelo cliente → execução (baixa de estoque)
 * → finalização (financeiro + garantia + comissão).
 */

const oficinaId = `test-os-${randomUUID().slice(0, 8)}`;
const usuarioId = `user-teste-${randomUUID().slice(0, 8)}`;
const mecanicoId = `mec-teste-${randomUUID().slice(0, 8)}`;
let clienteId = "";
let veiculoId = "";
let pecaId = "";
let osId = "";
let token = "";
let servicoItemId = "";
let pecaItemId = "";

const db = tenantDb(oficinaId);

beforeAll(async () => {
  await prisma.organization.create({
    data: {
      id: oficinaId,
      name: "Oficina Teste Fluxo",
      slug: oficinaId,
      createdAt: new Date(),
    },
  });
  await prisma.oficinaConfig.create({
    data: { oficinaId, garantiaPadraoDias: 90 },
  });
  await prisma.funcionarioPerfil.create({
    data: { oficinaId, userId: mecanicoId, cargo: "MECANICO", comissaoPercent: 10 },
  });
  const cliente = await prisma.cliente.create({
    data: { oficinaId, nome: "Cliente Fluxo" },
  });
  clienteId = cliente.id;
  const veiculo = await prisma.veiculo.create({
    data: { oficinaId, clienteId, placa: "FLX1A23" },
  });
  veiculoId = veiculo.id;
  const peca = await prisma.peca.create({
    data: {
      oficinaId,
      nome: "Filtro de teste",
      precoCusto: 20,
      precoVenda: 50,
      quantidade: 10,
      estoqueMinimo: 2,
    },
  });
  pecaId = peca.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("fluxo completo da ordem de serviço", () => {
  it("cria a OS com número sequencial e histórico", async () => {
    const os = await criarOS(db, oficinaId, usuarioId, {
      clienteId,
      veiculoId,
      mecanicoId,
      descricaoProblema: "Barulho no motor",
    });
    osId = os.id;
    expect(os.numero).toBe(1);
    expect(os.status).toBe("RECEBIDO");
    const historico = await db.oSHistorico.findMany({
      where: { ordemServicoId: osId },
    });
    expect(historico).toHaveLength(1);
  });

  it("rejeita veículo de outro cliente", async () => {
    const outroCliente = await prisma.cliente.create({
      data: { oficinaId, nome: "Outro" },
    });
    await expect(
      criarOS(db, oficinaId, usuarioId, {
        clienteId: outroCliente.id,
        veiculoId,
      })
    ).rejects.toThrow(/não pertence/);
  });

  it("lança itens e recalcula totais", async () => {
    const servico = await db.oSServico.create({
      data: {
        oficinaId,
        ordemServicoId: osId,
        descricao: "Mão de obra motor",
        valor: 300,
      },
    });
    servicoItemId = servico.id;
    const pecaItem = await db.oSPeca.create({
      data: {
        oficinaId,
        ordemServicoId: osId,
        pecaId,
        descricao: "Filtro de teste",
        quantidade: 2,
        valorUnitario: 50,
      },
    });
    pecaItemId = pecaItem.id;

    const totais = await recalcularTotais(db, osId);
    expect(totais.totalServicos).toBe(300);
    expect(totais.totalPecas).toBe(100);
    expect(totais.total).toBe(400);
  });

  it("gera link de aprovação e o cliente aprova parcialmente", async () => {
    await mudarStatus(db, oficinaId, osId, "AGUARDANDO_APROVACAO", usuarioId);
    const aprovacao = await criarAprovacao(db, oficinaId, osId);
    token = aprovacao.token;
    expect(token.length).toBeGreaterThan(20);

    const resultado = await responderAprovacao(token, {
      nome: "Cliente Fluxo",
      decisoes: [
        { tipo: "servico", id: servicoItemId, aprovado: true },
        { tipo: "peca", id: pecaItemId, aprovado: true },
      ],
      ip: "127.0.0.1",
      userAgent: "vitest",
    });
    expect(resultado.statusAprovacao).toBe("APROVADA");

    const os = await db.ordemServico.findUniqueOrThrow({ where: { id: osId } });
    expect(os.status).toBe("APROVADO");
    expect(paraNumero(os.total)).toBe(400);
  });

  it("não permite responder o mesmo link duas vezes", async () => {
    await expect(
      responderAprovacao(token, {
        nome: "Repetido",
        decisoes: [{ tipo: "servico", id: servicoItemId, aprovado: false }],
      })
    ).rejects.toThrow(/já foi respondido/);
  });

  it("execução dá baixa automática no estoque", async () => {
    await mudarStatus(db, oficinaId, osId, "EM_EXECUCAO", usuarioId);
    const peca = await prisma.peca.findUniqueOrThrow({ where: { id: pecaId } });
    expect(paraNumero(peca.quantidade)).toBe(8);
    const movimentacoes = await db.movimentacaoEstoque.findMany({
      where: { ordemServicoId: osId },
    });
    expect(movimentacoes).toHaveLength(1);
    expect(movimentacoes[0]!.tipo).toBe("SAIDA");
    const item = await prisma.oSPeca.findUniqueOrThrow({
      where: { id: pecaItemId },
    });
    expect(item.baixaEfetuada).toBe(true);
  });

  it("bloqueia transição inválida", async () => {
    await expect(
      mudarStatus(db, oficinaId, osId, "FINALIZADO", usuarioId)
    ).rejects.toThrow(/inválida/);
  });

  it("finalização gera financeiro, garantia e comissão", async () => {
    await mudarStatus(db, oficinaId, osId, "CONCLUIDO", usuarioId);
    await mudarStatus(db, oficinaId, osId, "ENTREGUE", usuarioId);
    await mudarStatus(db, oficinaId, osId, "FINALIZADO", usuarioId);

    const lancamentos = await db.lancamentoFinanceiro.findMany({
      where: { ordemServicoId: osId },
    });
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0]!.tipo).toBe("RECEITA");
    expect(paraNumero(lancamentos[0]!.valor)).toBe(400);

    const garantias = await db.garantia.findMany({
      where: { ordemServicoId: osId },
    });
    expect(garantias).toHaveLength(1);

    const comissoes = await db.comissao.findMany({
      where: { ordemServicoId: osId },
    });
    expect(comissoes).toHaveLength(1);
    // 10% sobre R$ 300 de serviços.
    expect(paraNumero(comissoes[0]!.valor)).toBe(30);
  });
});
