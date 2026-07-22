/** Placas brasileiras: formato antigo (ABC1234) e Mercosul (ABC1D23). */

const PLACA_ANTIGA = /^[A-Z]{3}\d{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

/** Remove hífen/espaços e põe em maiúsculas: "abc-1234" → "ABC1234". */
export function normalizarPlaca(placa: string): string {
  return placa.replace(/[\s-]/g, "").toUpperCase();
}

export function validarPlaca(placa: string): boolean {
  const p = normalizarPlaca(placa);
  return PLACA_ANTIGA.test(p) || PLACA_MERCOSUL.test(p);
}

/** Exibe com hífen no formato antigo (ABC-1234); Mercosul fica sem hífen. */
export function formatarPlaca(placa: string): string {
  const p = normalizarPlaca(placa);
  if (PLACA_ANTIGA.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}
