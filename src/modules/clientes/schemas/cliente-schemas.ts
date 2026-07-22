import { z } from "zod";
import { validarCpfCnpj, somenteDigitos } from "@/shared/utils/documento";
import { textoOpcional } from "@/shared/utils/zod";

export const clienteSchema = z.object({
  tipo: z.enum(["FISICA", "JURIDICA"]),
  nome: z.string().min(2, "Informe o nome.").max(120),
  cpfCnpj: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === "" || validarCpfCnpj(v),
      "CPF/CNPJ inválido."
    )
    .transform((v) => (v && v.trim() !== "" ? somenteDigitos(v) : undefined)),
  telefone: textoOpcional(20),
  whatsapp: textoOpcional(20),
  email: z
    .union([z.literal(""), z.email("E-mail inválido.")])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  cep: textoOpcional(9),
  endereco: textoOpcional(160),
  numero: textoOpcional(20),
  complemento: textoOpcional(60),
  bairro: textoOpcional(80),
  cidade: textoOpcional(80),
  estado: textoOpcional(2),
  observacoes: textoOpcional(2000),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
/** Valores do formulário ANTES do transform (o RHF trabalha com estes). */
export type ClienteFormValues = z.input<typeof clienteSchema>;
