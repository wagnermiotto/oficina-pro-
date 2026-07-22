import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(8, "A senha tem no mínimo 8 caracteres."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const cadastroSchema = z
  .object({
    nome: z.string().min(2, "Informe seu nome completo."),
    email: z.email("Informe um e-mail válido."),
    senha: z.string().min(8, "Use no mínimo 8 caracteres."),
    confirmarSenha: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    message: "As senhas não conferem.",
    path: ["confirmarSenha"],
  });
export type CadastroInput = z.infer<typeof cadastroSchema>;

export const onboardingSchema = z.object({
  nomeOficina: z
    .string()
    .min(2, "Informe o nome da oficina.")
    .max(80, "Máximo de 80 caracteres."),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
