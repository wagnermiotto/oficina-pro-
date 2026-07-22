import type { Prisma } from "@prisma/client";

export type ValorMonetario = number | string | Prisma.Decimal;

/** Converte Decimal do Prisma / string / number para number (2 casas). */
export function paraNumero(valor: ValorMonetario | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const n = typeof valor === "number" ? valor : Number(valor.toString());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Formata em BRL: 1234.5 → "R$ 1.234,50". */
export function formatarMoeda(valor: ValorMonetario | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(paraNumero(valor));
}

/** Interpreta entrada do usuário ("1.234,56" ou "1234.56") como number. */
export function parseMoeda(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;
  // Formato brasileiro: vírgula decimal (remove pontos de milhar).
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
