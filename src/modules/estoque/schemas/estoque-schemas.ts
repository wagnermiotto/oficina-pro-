import { z } from "zod";
import { textoOpcional } from "@/shared/utils/zod";

const decimalDeTexto = (casas: number, min = 0) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      if (!Number.isFinite(n)) return NaN;
      const fator = 10 ** casas;
      return Math.round(n * fator) / fator;
    })
    .refine((v) => Number.isFinite(v) && v >= min, "Valor inválido.");

export const pecaSchema = z.object({
  nome: z.string().min(2, "Informe o nome da peça.").max(160),
  codigo: textoOpcional(40),
  codigoBarras: textoOpcional(60),
  marca: textoOpcional(60),
  unidade: z.string().min(1).max(10).default("un"),
  categoriaId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  fornecedorId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  precoCusto: decimalDeTexto(2),
  precoVenda: decimalDeTexto(2),
  estoqueMinimo: decimalDeTexto(3),
  quantidadeInicial: decimalDeTexto(3),
  localizacao: textoOpcional(60),
});
export type PecaInput = z.infer<typeof pecaSchema>;
export type PecaFormValues = z.input<typeof pecaSchema>;

export const movimentacaoSchema = z.object({
  pecaId: z.string().min(1, "Selecione a peça."),
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : NaN;
    })
    .refine((v) => Number.isFinite(v) && v !== 0, "Quantidade inválida."),
  custoUnitario: decimalDeTexto(2).optional(),
  motivo: textoOpcional(200),
});
export type MovimentacaoInput = z.infer<typeof movimentacaoSchema>;
export type MovimentacaoFormValues = z.input<typeof movimentacaoSchema>;

export const categoriaSchema = z.object({
  nome: z.string().min(2, "Informe o nome.").max(80),
});

export const TIPO_MOVIMENTACAO_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
};

export const TIPO_MOVIMENTACAO_BADGE: Record<string, string> = {
  ENTRADA: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  SAIDA: "bg-destaque/15 text-destaque border-destaque/30",
  AJUSTE: "bg-chart-2/15 text-chart-2 border-chart-2/30",
};
