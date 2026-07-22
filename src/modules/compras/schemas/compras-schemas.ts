import { z } from "zod";
import { textoOpcional } from "@/shared/utils/zod";
import type { StatusPedidoCompra } from "@prisma/client";

export const fornecedorSchema = z.object({
  nome: z.string().min(2, "Informe o nome.").max(120),
  cnpj: textoOpcional(20),
  telefone: textoOpcional(20),
  email: z
    .union([z.literal(""), z.email("E-mail inválido.")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  observacoes: textoOpcional(1000),
});
export type FornecedorInput = z.infer<typeof fornecedorSchema>;
export type FornecedorFormValues = z.input<typeof fornecedorSchema>;

const decimal = (casas: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      const fator = 10 ** casas;
      return Number.isFinite(n) ? Math.round(n * fator) / fator : NaN;
    })
    .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido.");

export const pedidoItemSchema = z.object({
  pecaId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  descricao: z.string().min(2, "Descreva o item.").max(200),
  quantidade: decimal(3).refine((v) => v > 0, "Quantidade inválida."),
  custoUnitario: decimal(2),
});

export const pedidoCompraSchema = z.object({
  fornecedorId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  observacoes: textoOpcional(1000),
  itens: z.array(pedidoItemSchema).min(1, "Adicione ao menos um item."),
});
export type PedidoCompraInput = z.infer<typeof pedidoCompraSchema>;
export type PedidoCompraFormValues = z.input<typeof pedidoCompraSchema>;

export const TRANSICOES_PEDIDO: Record<StatusPedidoCompra, StatusPedidoCompra[]> = {
  SOLICITACAO: ["COTACAO", "PEDIDO", "CANCELADO"],
  COTACAO: ["PEDIDO", "CANCELADO"],
  PEDIDO: ["RECEBIDO", "CANCELADO"],
  RECEBIDO: [],
  CANCELADO: [],
};

export const STATUS_PEDIDO_LABEL: Record<StatusPedidoCompra, string> = {
  SOLICITACAO: "Solicitação",
  COTACAO: "Em cotação",
  PEDIDO: "Pedido enviado",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
};

export const STATUS_PEDIDO_BADGE: Record<StatusPedidoCompra, string> = {
  SOLICITACAO: "bg-muted text-muted-foreground",
  COTACAO: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  PEDIDO: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  RECEBIDO: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  CANCELADO: "bg-destructive/10 text-destructive border-destructive/30",
};
