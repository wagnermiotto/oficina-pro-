import type { StatusOS } from "@prisma/client";

/**
 * Regras puras da Ordem de Serviço: transições de status e cálculo de totais.
 * Sem dependência de banco — coberto por testes unitários (os-regras.test.ts).
 */

/** Transições válidas do fluxo. */
export const TRANSICOES_OS: Record<StatusOS, StatusOS[]> = {
  RECEBIDO: ["DIAGNOSTICO", "AGUARDANDO_APROVACAO", "CANCELADO"],
  DIAGNOSTICO: ["AGUARDANDO_APROVACAO", "APROVADO", "CANCELADO"],
  AGUARDANDO_APROVACAO: ["APROVADO", "DIAGNOSTICO", "CANCELADO"],
  APROVADO: ["EM_EXECUCAO", "AGUARDANDO_PECAS", "CANCELADO"],
  EM_EXECUCAO: ["AGUARDANDO_PECAS", "CONCLUIDO", "CANCELADO"],
  AGUARDANDO_PECAS: ["EM_EXECUCAO", "CANCELADO"],
  CONCLUIDO: ["ENTREGUE", "EM_EXECUCAO"],
  ENTREGUE: ["FINALIZADO"],
  FINALIZADO: [],
  CANCELADO: [],
};

export function transicaoValida(de: StatusOS, para: StatusOS): boolean {
  return TRANSICOES_OS[de].includes(para);
}

export class TransicaoInvalidaError extends Error {
  constructor(de: StatusOS, para: StatusOS) {
    super(`Transição de status inválida: ${de} → ${para}.`);
    this.name = "TransicaoInvalidaError";
  }
}

// --- Cálculo de totais -------------------------------------------------------

export interface ItemServicoCalculo {
  valor: number;
  recusado?: boolean;
}

export interface ItemPecaCalculo {
  quantidade: number;
  valorUnitario: number;
  recusado?: boolean;
}

export interface TotaisOS {
  totalServicos: number;
  totalPecas: number;
  subtotal: number;
  desconto: number;
  imposto: number;
  total: number;
}

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

/**
 * Calcula os totais da OS em centavos (evita erro de ponto flutuante):
 * total = (serviços + peças − desconto) × (1 + imposto%).
 * Itens recusados pelo cliente não entram na conta.
 */
export function calcularTotaisOS(
  servicos: ItemServicoCalculo[],
  pecas: ItemPecaCalculo[],
  descontoValor: number,
  impostoPercent: number
): TotaisOS {
  const totalServicosCents = servicos
    .filter((s) => !s.recusado)
    .reduce((soma, s) => soma + centavos(s.valor), 0);
  const totalPecasCents = pecas
    .filter((p) => !p.recusado)
    .reduce((soma, p) => soma + Math.round(centavos(p.valorUnitario) * p.quantidade), 0);

  const subtotalCents = totalServicosCents + totalPecasCents;
  const descontoCents = Math.min(centavos(descontoValor), subtotalCents);
  const baseCents = subtotalCents - descontoCents;
  const impostoCents = Math.round((baseCents * impostoPercent) / 100);
  const totalCents = baseCents + impostoCents;

  return {
    totalServicos: totalServicosCents / 100,
    totalPecas: totalPecasCents / 100,
    subtotal: subtotalCents / 100,
    desconto: descontoCents / 100,
    imposto: impostoCents / 100,
    total: totalCents / 100,
  };
}
