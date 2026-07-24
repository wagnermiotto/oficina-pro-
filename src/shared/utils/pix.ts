/**
 * Gerador do "PIX copia e cola" (BR Code estático, padrão EMV do Banco Central).
 * Tudo local — sem taxa e sem serviço externo. O cliente cola o código no app
 * do banco e o valor/recebedor já vêm preenchidos.
 */

/** Monta um campo EMV: id + tamanho (2 dígitos) + valor. */
function campo(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, "0");
  return `${id}${tamanho}${valor}`;
}

/** CRC16-CCITT (polinômio 0x1021, init 0xFFFF) — exigido no fim do BR Code. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e caracteres fora do ASCII imprimível, em maiúsculas. */
function sanitizar(texto: string, maxLen: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, maxLen);
}

export interface DadosPix {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  valor?: number | null;
  /** Identificador da transação (ex.: número da OS). Até 25 chars. */
  txid?: string | null;
}

/**
 * Gera o payload "copia e cola" do PIX. Retorna null quando faltam dados
 * essenciais (chave, nome ou cidade).
 */
export function gerarPixCopiaECola(dados: DadosPix): string | null {
  const chave = dados.chave?.trim();
  const nome = sanitizar(dados.nomeRecebedor ?? "", 25);
  const cidade = sanitizar(dados.cidade ?? "", 15);
  if (!chave || !nome || !cidade) return null;

  const mai = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const merchantAccount = campo("26", mai);

  const txid = dados.txid
    ? sanitizar(dados.txid, 25).replace(/[^A-Z0-9]/g, "") || "***"
    : "***";
  const adicional = campo("62", campo("05", txid));

  let payload =
    campo("00", "01") + // Payload Format Indicator
    campo("01", "12") + // Point of Initiation Method: uso único (com valor)
    merchantAccount +
    campo("52", "0000") + // Merchant Category Code
    campo("53", "986") + // Moeda: BRL
    (dados.valor && dados.valor > 0
      ? campo("54", dados.valor.toFixed(2))
      : "") +
    campo("58", "BR") + // País
    campo("59", nome) +
    campo("60", cidade) +
    adicional;

  // O CRC é calculado sobre o payload + "6304".
  payload += "6304";
  return payload + crc16(payload);
}
