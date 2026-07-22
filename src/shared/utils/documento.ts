/** Utilidades de CPF/CNPJ: validação com dígito verificador e formatação. */

export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

export function validarCPF(cpf: string): boolean {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const posicao of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < posicao; i++) {
      soma += Number(d[i]) * (posicao + 1 - i);
    }
    const resto = (soma * 10) % 11 % 10;
    if (resto !== Number(d[posicao])) return false;
  }
  return true;
}

export function validarCNPJ(cnpj: string): boolean {
  const d = somenteDigitos(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calcular = (tamanho: number) => {
    const pesos =
      tamanho === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, peso, i) => acc + Number(d[i]) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calcular(12) === Number(d[12]) && calcular(13) === Number(d[13]);
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos) conforme o tamanho. */
export function validarCpfCnpj(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length === 11) return validarCPF(d);
  if (d.length === 14) return validarCNPJ(d);
  return false;
}

export function formatarCpfCnpj(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return valor;
}

export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return valor;
}

export function formatarCEP(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 8) return d.replace(/(\d{5})(\d{3})/, "$1-$2");
  return valor;
}
