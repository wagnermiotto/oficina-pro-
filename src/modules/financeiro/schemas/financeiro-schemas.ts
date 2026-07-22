import { z } from "zod";
import { textoOpcional } from "@/shared/utils/zod";
import type {
  FormaPagamento,
  StatusLancamento,
  TipoLancamento,
} from "@prisma/client";

export const lancamentoSchema = z.object({
  tipo: z.enum(["RECEITA", "DESPESA"]),
  descricao: z.string().min(2, "Descreva o lançamento.").max(200),
  valor: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
    })
    .refine((v) => Number.isFinite(v) && v > 0, "Informe um valor maior que zero."),
  vencimento: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      if (v instanceof Date) return v;
      return v === "" ? undefined : new Date(`${v}T12:00:00`);
    }),
  centroCustoId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  formaPagamento: z
    .enum(["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "BOLETO", "TRANSFERENCIA", "OUTRO"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pagoAgora: z.boolean().optional(),
  observacoes: textoOpcional(1000),
});
export type LancamentoInput = z.infer<typeof lancamentoSchema>;
export type LancamentoFormValues = z.input<typeof lancamentoSchema>;

export const pagamentoSchema = z.object({
  formaPagamento: z.enum([
    "PIX",
    "DINHEIRO",
    "CARTAO_CREDITO",
    "CARTAO_DEBITO",
    "BOLETO",
    "TRANSFERENCIA",
    "OUTRO",
  ]),
});

export const TIPO_LANCAMENTO_LABEL: Record<TipoLancamento, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
};

export const STATUS_LANCAMENTO_LABEL: Record<StatusLancamento, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

export const STATUS_LANCAMENTO_BADGE: Record<StatusLancamento, string> = {
  PENDENTE: "bg-destaque/15 text-destaque border-destaque/30",
  PAGO: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  CANCELADO: "bg-muted text-muted-foreground",
};

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  PIX: "PIX",
  DINHEIRO: "Dinheiro",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  OUTRO: "Outro",
};
