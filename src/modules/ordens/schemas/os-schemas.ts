import { z } from "zod";
import { textoOpcional } from "@/shared/utils/zod";

export const novaOSSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  veiculoId: z.string().min(1, "Selecione o veículo."),
  mecanicoId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  descricaoProblema: textoOpcional(2000),
  dataPrevista: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      if (v instanceof Date) return v;
      return v === "" ? undefined : new Date(`${v}T12:00:00`);
    }),
  garantiaDias: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 ? n : undefined;
    }),
});
export type NovaOSInput = z.infer<typeof novaOSSchema>;
export type NovaOSFormValues = z.input<typeof novaOSSchema>;

const valorMonetario = z
  .union([z.string(), z.number()])
  .transform((v) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  })
  .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido.");

export const itemServicoSchema = z.object({
  servicoId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  descricao: z.string().min(2, "Descreva o serviço.").max(300),
  valor: valorMonetario,
  tempoEstimadoMin: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : undefined;
    }),
});
export type ItemServicoInput = z.infer<typeof itemServicoSchema>;
export type ItemServicoFormValues = z.input<typeof itemServicoSchema>;

export const itemPecaSchema = z.object({
  pecaId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  descricao: z.string().min(2, "Descreva a peça.").max(300),
  quantidade: z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : NaN;
    })
    .refine((v) => Number.isFinite(v) && v > 0, "Quantidade inválida."),
  valorUnitario: valorMonetario,
});
export type ItemPecaInput = z.infer<typeof itemPecaSchema>;
export type ItemPecaFormValues = z.input<typeof itemPecaSchema>;

export const itemDiagnosticoSchema = z.object({
  sistema: z.enum([
    "MOTOR",
    "FREIOS",
    "SUSPENSAO",
    "DIRECAO",
    "TRANSMISSAO",
    "ELETRICA",
    "INJECAO",
    "AR_CONDICIONADO",
    "PNEUS",
    "LATARIA",
    "PINTURA",
    "ESCAPAMENTO",
    "OUTRO",
  ]),
  descricao: z.string().min(2, "Descreva o problema.").max(1000),
  urgencia: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]),
  valorEstimado: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
    }),
  recomendacao: textoOpcional(500),
});
export type ItemDiagnosticoInput = z.infer<typeof itemDiagnosticoSchema>;
export type ItemDiagnosticoFormValues = z.input<typeof itemDiagnosticoSchema>;

export const ajusteOSSchema = z.object({
  mecanicoId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  descontoValor: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
    }),
  impostoPercent: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 0;
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n >= 0 && n <= 100
        ? Math.round(n * 100) / 100
        : 0;
    }),
  observacoesInternas: textoOpcional(3000),
});
export type AjusteOSInput = z.infer<typeof ajusteOSSchema>;
export type AjusteOSFormValues = z.input<typeof ajusteOSSchema>;

export const respostaAprovacaoSchema = z.object({
  nome: z.string().min(2, "Informe seu nome completo.").max(120),
  decisoes: z
    .array(
      z.object({
        tipo: z.enum(["servico", "peca"]),
        id: z.string(),
        aprovado: z.boolean(),
      })
    )
    .min(1, "Nenhum item para aprovar."),
  assinatura: z.string().optional(),
});
export type RespostaAprovacaoInput = z.infer<typeof respostaAprovacaoSchema>;

export const SISTEMA_LABEL: Record<string, string> = {
  MOTOR: "Motor",
  FREIOS: "Freios",
  SUSPENSAO: "Suspensão",
  DIRECAO: "Direção",
  TRANSMISSAO: "Transmissão",
  ELETRICA: "Elétrica",
  INJECAO: "Injeção",
  AR_CONDICIONADO: "Ar-condicionado",
  PNEUS: "Pneus",
  LATARIA: "Lataria",
  PINTURA: "Pintura",
  ESCAPAMENTO: "Escapamento",
  OUTRO: "Outro",
};

export const URGENCIA_LABEL: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const URGENCIA_BADGE: Record<string, string> = {
  BAIXA: "bg-muted text-muted-foreground",
  MEDIA: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  ALTA: "bg-destaque/15 text-destaque border-destaque/30",
  CRITICA: "bg-destructive/10 text-destructive border-destructive/30",
};
