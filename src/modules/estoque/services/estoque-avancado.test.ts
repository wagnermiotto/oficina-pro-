import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import { curvaAbc } from "./estoque-service";
import { sugerirPedidos } from "@/modules/compras/services/compras-service";
import {
  concluirContagem,
  criarContagem,
  obterContagem,
  salvarContagens,
} from "./contagem-service";

/**
 * Integração do estoque avançado (Onda 1): curva ABC, sugestão de reposição
 * e contagem cíclica — todos contra o banco real, como os demais fluxos.
 */

const oficinaId = `test-estq-adv-${randomUUID().slice(0, 8)}`;
const usuarioId = "user-estq-adv";
const db = tenantDb(oficinaId);

// Peças: A (alto consumo), B (médio), C (baixo), D (sem consumo).
let pecaA = "";
let pecaB = "";
let pecaC = "";
let pecaD = "";
let fornecedorId = "";

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: oficinaId, name: "Oficina Estq Adv", slug: oficinaId, createdAt: new Date() },
  });
  await prisma.oficinaConfig.create({ data: { oficinaId } });
  const fornecedor = await prisma.fornecedor.create({
    data: { oficinaId, nome: "Fornecedor ABC" },
  });
  fornecedorId = fornecedor.id;

  // Saldos atuais: A e C acima do mínimo; B e D no ponto de pedido.
  const [a, b, c, d] = await Promise.all([
    prisma.peca.create({
      data: { oficinaId, nome: "Peça A", precoCusto: 10, quantidade: 100, estoqueMinimo: 10, fornecedorId },
    }),
    prisma.peca.create({
      data: { oficinaId, nome: "Peça B", precoCusto: 10, quantidade: 2, estoqueMinimo: 5, fornecedorId },
    }),
    prisma.peca.create({
      data: { oficinaId, nome: "Peça C", precoCusto: 10, quantidade: 45, estoqueMinimo: 5 },
    }),
    prisma.peca.create({
      data: { oficinaId, nome: "Peça D", precoCusto: 10, quantidade: 5, estoqueMinimo: 5 },
    }),
  ]);
  pecaA = a.id;
  pecaB = b.id;
  pecaC = c.id;
  pecaD = d.id;

  // Histórico de consumo (SAIDA), valorado por custo 10: A=80→800, B=15→150,
  // C=5→50, D=0. Inserido direto (vendas passadas já baixaram o saldo real).
  await prisma.movimentacaoEstoque.createMany({
    data: [
      { oficinaId, pecaId: pecaA, tipo: "SAIDA", quantidade: 80 },
      { oficinaId, pecaId: pecaB, tipo: "SAIDA", quantidade: 15 },
      { oficinaId, pecaId: pecaC, tipo: "SAIDA", quantidade: 5 },
    ],
  });
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("curva ABC", () => {
  it("classifica por valor de consumo acumulado (80/15/5) e trata item sem giro", async () => {
    const { itens, resumo } = await curvaAbc(db);
    const porNome = new Map(itens.map((i) => [i.nome, i]));

    expect(porNome.get("Peça A")!.classe).toBe("A"); // 80% acumulado
    expect(porNome.get("Peça B")!.classe).toBe("B"); // 95% acumulado
    expect(porNome.get("Peça C")!.classe).toBe("C"); // 100%
    expect(porNome.get("Peça D")!.classe).toBe("C"); // sem consumo
    expect(porNome.get("Peça A")!.valorConsumo).toBe(800);

    const classeA = resumo.find((r) => r.classe === "A")!;
    expect(classeA.qtdItens).toBe(1);
  });
});

describe("sugestão de pedido de reposição", () => {
  it("inclui só peças no ponto de pedido, com reposição 2×min − saldo, agrupadas por fornecedor", async () => {
    const grupos = await sugerirPedidos(db);
    const itensSugeridos = grupos.flatMap((g) => g.itens);
    const nomes = itensSugeridos.map((i) => i.descricao);

    // B (2 ≤ 5) e D (5 ≤ 5) entram; A e C não.
    expect(nomes.some((n) => n.includes("Peça B"))).toBe(true);
    expect(nomes.some((n) => n.includes("Peça D"))).toBe(true);
    expect(nomes.some((n) => n.includes("Peça A"))).toBe(false);

    const itemB = itensSugeridos.find((i) => i.descricao.includes("Peça B"))!;
    expect(itemB.quantidade).toBe(8); // 2*5 - 2

    // B tem fornecedor, D não → grupos separados.
    const grupoComFornecedor = grupos.find((g) => g.fornecedorId === fornecedorId);
    const grupoSemFornecedor = grupos.find((g) => g.fornecedorId === null);
    expect(grupoComFornecedor?.itens.some((i) => i.descricao.includes("Peça B"))).toBe(true);
    expect(grupoSemFornecedor?.itens.some((i) => i.descricao.includes("Peça D"))).toBe(true);
  });
});

describe("contagem cíclica", () => {
  let contagemId = "";

  it("abre contagem com snapshot do saldo do sistema", async () => {
    const contagem = await criarContagem(db, oficinaId, usuarioId, {});
    contagemId = contagem.id;
    const completa = await obterContagem(db, contagemId);
    expect(completa!.itens.length).toBe(4);
    expect(completa!.status).toBe("ABERTA");
  });

  it("conclui aplicando ajuste só nas divergências", async () => {
    const completa = await obterContagem(db, contagemId);
    const itemC = completa!.itens.find((i) => i.pecaId === pecaC)!; // saldo 45 após saída
    const itemA = completa!.itens.find((i) => i.pecaId === pecaA)!; // saldo 20, sem divergência

    // Conta C com 40 (divergência −5) e A igual ao sistema (sem ajuste).
    await salvarContagens(db, contagemId, [
      { itemId: itemC.id, saldoContado: 40 },
      { itemId: itemA.id, saldoContado: paraNumero(itemA.saldoSistema) },
    ]);

    const resultado = await concluirContagem(db, oficinaId, usuarioId, contagemId);
    expect(resultado.ajustes).toBe(1);

    const peca = await prisma.peca.findUniqueOrThrow({ where: { id: pecaC } });
    expect(paraNumero(peca.quantidade)).toBe(40);

    const ajuste = await db.movimentacaoEstoque.findFirst({
      where: { pecaId: pecaC, tipo: "AJUSTE" },
      orderBy: { createdAt: "desc" },
    });
    expect(ajuste).not.toBeNull();
    expect(paraNumero(ajuste!.quantidade)).toBe(-5);
  });

  it("não permite concluir uma contagem já concluída", async () => {
    await expect(
      concluirContagem(db, oficinaId, usuarioId, contagemId)
    ).rejects.toThrow(/concluída|cancelada/i);
  });
});
