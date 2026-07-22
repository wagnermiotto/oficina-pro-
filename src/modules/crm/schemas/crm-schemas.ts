import { z } from "zod";
import { textoOpcional } from "@/shared/utils/zod";
import type { TipoInteracao } from "@prisma/client";

export const interacaoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  tipo: z.enum(["LIGACAO", "WHATSAPP", "EMAIL", "PRESENCIAL", "LEMBRETE", "OBSERVACAO"]),
  mensagem: z.string().min(2, "Descreva o contato.").max(2000),
  proximoContato: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      if (v instanceof Date) return v;
      return v === "" ? undefined : new Date(`${v}T09:00:00`);
    }),
  observacoes: textoOpcional(500),
});
export type InteracaoInput = z.infer<typeof interacaoSchema>;
export type InteracaoFormValues = z.input<typeof interacaoSchema>;

export const TIPO_INTERACAO_LABEL: Record<TipoInteracao, string> = {
  LIGACAO: "Ligação",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  PRESENCIAL: "Presencial",
  LEMBRETE: "Lembrete",
  OBSERVACAO: "Observação",
};
