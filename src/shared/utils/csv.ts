/**
 * Gera CSV compatível com Excel brasileiro: separador ";", BOM UTF-8,
 * valores com aspas escapadas.
 */
export function gerarCSV(
  cabecalho: string[],
  linhas: (string | number | null | undefined)[][]
): string {
  const escapar = (valor: string | number | null | undefined): string => {
    if (valor === null || valor === undefined) return "";
    const texto = String(valor);
    if (/[";\n]/.test(texto)) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };
  const corpo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escapar).join(";"))
    .join("\r\n");
  return `﻿${corpo}`;
}

/** Número no formato decimal brasileiro para CSV (vírgula). */
export function numeroCSV(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}
