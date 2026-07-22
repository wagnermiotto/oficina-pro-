import { z } from "zod";
import { inteiroOpcionalDeTexto } from "@/shared/utils/zod";

export const avariaSchema = z.object({
  local: z.string().min(1, "Informe o local da avaria.").max(80),
  tipo: z.enum(["RISCO", "AMASSADO", "QUEBRADO", "TRINCADO", "FALTANDO", "OUTRO"]),
  descricao: z.string().max(300).optional(),
});

export const checkInSchema = z.object({
  quilometragem: inteiroOpcionalDeTexto({ min: 0, mensagem: "Km inválido." }),
  nivelCombustivel: z
    .enum(["VAZIO", "QUARTO", "MEIO", "TRES_QUARTOS", "CHEIO"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  chaveReserva: z.boolean(),
  estepe: z.boolean(),
  macaco: z.boolean(),
  triangulo: z.boolean(),
  objetosDeixados: z.string().max(500).optional(),
  observacoes: z.string().max(2000).optional(),
  avarias: z.array(avariaSchema),
  assinatura: z.string().optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckInFormValues = z.input<typeof checkInSchema>;

export const NIVEL_COMBUSTIVEL_LABEL: Record<string, string> = {
  VAZIO: "Vazio",
  QUARTO: "1/4",
  MEIO: "1/2",
  TRES_QUARTOS: "3/4",
  CHEIO: "Cheio",
};

export const TIPO_AVARIA_LABEL: Record<string, string> = {
  RISCO: "Risco",
  AMASSADO: "Amassado",
  QUEBRADO: "Quebrado",
  TRINCADO: "Trincado",
  FALTANDO: "Peça faltando",
  OUTRO: "Outro",
};
