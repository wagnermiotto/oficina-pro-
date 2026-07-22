import { z } from "zod";
import { textoOpcional } from "@/shared/utils/zod";
import type { StatusAgendamento, TipoAgendamento } from "@prisma/client";

export const agendamentoSchema = z
  .object({
    titulo: z.string().min(2, "Informe o título.").max(120),
    tipo: z.enum([
      "ENTRADA",
      "REVISAO",
      "TROCA_OLEO",
      "ENTREGA",
      "RETORNO",
      "ORCAMENTO",
      "OUTRO",
    ]),
    clienteId: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? v : undefined)),
    veiculoId: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? v : undefined)),
    data: z.string().min(1, "Informe a data."),
    horaInicio: z.string().min(1, "Informe o horário."),
    horaFim: z.string().optional(),
    observacoes: textoOpcional(1000),
  })
  .transform((dados) => {
    const inicio = new Date(`${dados.data}T${dados.horaInicio}:00`);
    const fim =
      dados.horaFim && dados.horaFim !== ""
        ? new Date(`${dados.data}T${dados.horaFim}:00`)
        : undefined;
    return { ...dados, inicio, fim };
  })
  .refine((dados) => !Number.isNaN(dados.inicio.getTime()), {
    message: "Data ou horário inválido.",
  })
  .refine((dados) => !dados.fim || dados.fim > dados.inicio, {
    message: "O horário final deve ser depois do inicial.",
  });

export type AgendamentoInput = z.infer<typeof agendamentoSchema>;
export type AgendamentoFormValues = z.input<typeof agendamentoSchema>;

export const TIPO_AGENDAMENTO_LABEL: Record<TipoAgendamento, string> = {
  ENTRADA: "Entrada de veículo",
  REVISAO: "Revisão",
  TROCA_OLEO: "Troca de óleo",
  ENTREGA: "Entrega",
  RETORNO: "Retorno",
  ORCAMENTO: "Orçamento",
  OUTRO: "Outro",
};

export const TIPO_AGENDAMENTO_COR: Record<TipoAgendamento, string> = {
  ENTRADA: "border-l-chart-2 bg-chart-2/10",
  REVISAO: "border-l-chart-3 bg-chart-3/10",
  TROCA_OLEO: "border-l-destaque bg-destaque/10",
  ENTREGA: "border-l-chart-5 bg-chart-5/10",
  RETORNO: "border-l-chart-4 bg-chart-4/10",
  ORCAMENTO: "border-l-primary bg-primary/10",
  OUTRO: "border-l-muted-foreground bg-muted",
};

export const STATUS_AGENDAMENTO_LABEL: Record<StatusAgendamento, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTOU: "Não compareceu",
};
