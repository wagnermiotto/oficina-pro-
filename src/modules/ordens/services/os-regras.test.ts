import { describe, expect, it } from "vitest";
import {
  calcularTotaisOS,
  transicaoValida,
  TRANSICOES_OS,
} from "./os-regras";

describe("transições de status da OS", () => {
  it("permite o fluxo feliz completo", () => {
    const fluxo = [
      "RECEBIDO",
      "DIAGNOSTICO",
      "AGUARDANDO_APROVACAO",
      "APROVADO",
      "EM_EXECUCAO",
      "CONCLUIDO",
      "ENTREGUE",
      "FINALIZADO",
    ] as const;
    for (let i = 0; i < fluxo.length - 1; i++) {
      expect(transicaoValida(fluxo[i]!, fluxo[i + 1]!)).toBe(true);
    }
  });

  it("permite ida e volta de aguardando peças", () => {
    expect(transicaoValida("EM_EXECUCAO", "AGUARDANDO_PECAS")).toBe(true);
    expect(transicaoValida("AGUARDANDO_PECAS", "EM_EXECUCAO")).toBe(true);
  });

  it("bloqueia transições inválidas", () => {
    expect(transicaoValida("RECEBIDO", "FINALIZADO")).toBe(false);
    expect(transicaoValida("FINALIZADO", "RECEBIDO")).toBe(false);
    expect(transicaoValida("CANCELADO", "APROVADO")).toBe(false);
    expect(transicaoValida("ENTREGUE", "EM_EXECUCAO")).toBe(false);
  });

  it("estados terminais não têm saída", () => {
    expect(TRANSICOES_OS.FINALIZADO).toHaveLength(0);
    expect(TRANSICOES_OS.CANCELADO).toHaveLength(0);
  });
});

describe("cálculo de totais da OS", () => {
  it("soma serviços e peças", () => {
    const totais = calcularTotaisOS(
      [{ valor: 100 }, { valor: 50.5 }],
      [{ quantidade: 2, valorUnitario: 30 }, { quantidade: 0.5, valorUnitario: 55 }],
      0,
      0
    );
    expect(totais.totalServicos).toBe(150.5);
    expect(totais.totalPecas).toBe(87.5);
    expect(totais.total).toBe(238);
  });

  it("ignora itens recusados pelo cliente", () => {
    const totais = calcularTotaisOS(
      [{ valor: 100 }, { valor: 200, recusado: true }],
      [{ quantidade: 1, valorUnitario: 80, recusado: true }],
      0,
      0
    );
    expect(totais.total).toBe(100);
  });

  it("aplica desconto antes do imposto", () => {
    const totais = calcularTotaisOS(
      [{ valor: 1000 }],
      [],
      100,
      10
    );
    // (1000 − 100) × 1,10 = 990
    expect(totais.desconto).toBe(100);
    expect(totais.imposto).toBe(90);
    expect(totais.total).toBe(990);
  });

  it("limita o desconto ao subtotal (nunca total negativo)", () => {
    const totais = calcularTotaisOS([{ valor: 50 }], [], 500, 0);
    expect(totais.desconto).toBe(50);
    expect(totais.total).toBe(0);
  });

  it("não sofre com erro de ponto flutuante", () => {
    const totais = calcularTotaisOS(
      [{ valor: 0.1 }, { valor: 0.2 }],
      [{ quantidade: 3, valorUnitario: 0.1 }],
      0,
      0
    );
    expect(totais.total).toBe(0.6);
  });
});
