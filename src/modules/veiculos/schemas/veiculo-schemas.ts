import { z } from "zod";
import { normalizarPlaca, validarPlaca } from "@/shared/utils/placa";
import { inteiroOpcionalDeTexto, textoOpcional } from "@/shared/utils/zod";

const anoAtual = new Date().getFullYear();

export const veiculoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente proprietário."),
  tipo: z.enum(["CARRO", "MOTO"]),
  placa: z
    .string()
    .min(7, "Informe a placa.")
    .refine(validarPlaca, "Placa inválida (use ABC-1234 ou ABC1D23).")
    .transform(normalizarPlaca),
  marca: textoOpcional(60),
  modelo: textoOpcional(80),
  ano: inteiroOpcionalDeTexto({
    min: 1900,
    max: anoAtual + 1,
    mensagem: "Ano inválido.",
  }),
  anoModelo: inteiroOpcionalDeTexto({
    min: 1900,
    max: anoAtual + 2,
    mensagem: "Ano inválido.",
  }),
  cor: textoOpcional(30),
  chassi: textoOpcional(30),
  renavam: textoOpcional(20),
  numeroMotor: textoOpcional(30),
  quilometragem: inteiroOpcionalDeTexto({ min: 0, mensagem: "Km inválido." }),
  combustivel: z
    .enum(["GASOLINA", "ETANOL", "FLEX", "DIESEL", "GNV", "ELETRICO", "HIBRIDO"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  cambio: z
    .enum(["MANUAL", "AUTOMATICO", "CVT", "AUTOMATIZADO"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  observacoes: textoOpcional(2000),
});

export type VeiculoInput = z.infer<typeof veiculoSchema>;
export type VeiculoFormValues = z.input<typeof veiculoSchema>;

export const COMBUSTIVEL_LABEL: Record<string, string> = {
  GASOLINA: "Gasolina",
  ETANOL: "Etanol",
  FLEX: "Flex",
  DIESEL: "Diesel",
  GNV: "GNV",
  ELETRICO: "Elétrico",
  HIBRIDO: "Híbrido",
};

export const CAMBIO_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  AUTOMATICO: "Automático",
  CVT: "CVT",
  AUTOMATIZADO: "Automatizado",
};
