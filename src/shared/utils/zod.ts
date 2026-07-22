import { z } from "zod";

/**
 * Campo numérico inteiro opcional vindo de <Input> (string).
 * "" ou ausente → undefined; senão valida como inteiro no intervalo.
 * Mantém o tipo de entrada como string (compatível com react-hook-form).
 */
/** Texto opcional: "" ou espaços viram undefined (grava null no banco). */
export function textoOpcional(max = 255) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));
}

export function inteiroOpcionalDeTexto(opcoes?: {
  min?: number;
  max?: number;
  mensagem?: string;
}) {
  const { min, max, mensagem = "Valor inválido." } = opcoes ?? {};
  return z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "number") return v;
      return v.trim() === "" ? undefined : Number(v);
    })
    .refine(
      (v) =>
        v === undefined ||
        (Number.isInteger(v) &&
          (min === undefined || v >= min) &&
          (max === undefined || v <= max)),
      mensagem
    );
}
