import { describe, expect, it } from "vitest";
import { gerarPixCopiaECola } from "./pix";

/** Recalcula o CRC16-CCITT sobre o payload (sem os 4 dígitos finais). */
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

describe("gerarPixCopiaECola", () => {
  it("retorna null sem dados essenciais", () => {
    expect(gerarPixCopiaECola({ chave: "", nomeRecebedor: "X", cidade: "Y" })).toBeNull();
    expect(
      gerarPixCopiaECola({ chave: "a@b.com", nomeRecebedor: "", cidade: "Y" })
    ).toBeNull();
  });

  it("gera payload EMV válido com CRC correto", () => {
    const codigo = gerarPixCopiaECola({
      chave: "oficina@pix.com",
      nomeRecebedor: "Oficina Demo",
      cidade: "São Paulo",
      valor: 190,
      txid: "OS0900",
    })!;

    expect(codigo).toBeTruthy();
    expect(codigo.startsWith("000201")).toBe(true); // Payload Format + método
    expect(codigo).toContain("br.gov.bcb.pix");
    expect(codigo).toContain("oficina@pix.com");
    expect(codigo).toContain("5406190.00"); // campo 54 valor
    expect(codigo).toContain("5802BR");

    // CRC: os últimos 4 chars devem bater com o recálculo sobre o resto.
    const semCrc = codigo.slice(0, -4);
    expect(semCrc.endsWith("6304")).toBe(true);
    expect(codigo.slice(-4)).toBe(crc16(semCrc));
  });

  it("omite o valor quando ausente (cobrança em aberto)", () => {
    const codigo = gerarPixCopiaECola({
      chave: "11999998888",
      nomeRecebedor: "Oficina",
      cidade: "Rio",
    })!;
    expect(codigo).not.toContain("5406");
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  it("remove acentos do nome e cidade (ASCII imprimível)", () => {
    const codigo = gerarPixCopiaECola({
      chave: "a@b.com",
      nomeRecebedor: "José Mecânica",
      cidade: "São Paulo",
      valor: 10,
    })!;
    expect(codigo).toContain("JOSE MECANICA");
    expect(codigo).toContain("SAO PAULO");
    // Sem caracteres fora do ASCII imprimível.
    expect(/^[\x20-\x7E]+$/.test(codigo)).toBe(true);
  });
});
