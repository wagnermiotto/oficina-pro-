import { describe, expect, it } from "vitest";
import { formatarMoeda, parseMoeda, paraNumero } from "./moeda";
import {
  formatarCpfCnpj,
  formatarTelefone,
  validarCNPJ,
  validarCPF,
  validarCpfCnpj,
} from "./documento";
import { formatarPlaca, normalizarPlaca, validarPlaca } from "./placa";

describe("moeda", () => {
  it("formata em BRL", () => {
    expect(formatarMoeda(1234.5)).toMatch(/R\$\s?1\.234,50/);
    expect(formatarMoeda(0)).toMatch(/R\$\s?0,00/);
  });
  it("parseia entrada brasileira e americana", () => {
    expect(parseMoeda("1.234,56")).toBe(1234.56);
    expect(parseMoeda("R$ 89,90")).toBe(89.9);
    expect(parseMoeda("1234.56")).toBe(1234.56);
    expect(parseMoeda("")).toBe(0);
  });
  it("arredonda para 2 casas", () => {
    expect(paraNumero(10.005)).toBe(10.01);
    expect(paraNumero(null)).toBe(0);
  });
});

describe("cpf/cnpj", () => {
  it("valida CPF correto e rejeita inválidos", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
    expect(validarCPF("529.982.247-26")).toBe(false);
    expect(validarCPF("111.111.111-11")).toBe(false);
    expect(validarCPF("123")).toBe(false);
  });
  it("valida CNPJ correto e rejeita inválidos", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
    expect(validarCNPJ("11.222.333/0001-82")).toBe(false);
    expect(validarCNPJ("00.000.000/0000-00")).toBe(false);
  });
  it("decide entre CPF e CNPJ pelo tamanho", () => {
    expect(validarCpfCnpj("52998224725")).toBe(true);
    expect(validarCpfCnpj("11222333000181")).toBe(true);
    expect(validarCpfCnpj("123456")).toBe(false);
  });
  it("formata documentos e telefone", () => {
    expect(formatarCpfCnpj("52998224725")).toBe("529.982.247-25");
    expect(formatarCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("placa", () => {
  it("valida formatos antigo e Mercosul", () => {
    expect(validarPlaca("ABC-1234")).toBe(true);
    expect(validarPlaca("abc1d23")).toBe(true);
    expect(validarPlaca("AB1234")).toBe(false);
    expect(validarPlaca("ABCD123")).toBe(false);
  });
  it("normaliza e formata", () => {
    expect(normalizarPlaca(" abc-1234 ")).toBe("ABC1234");
    expect(formatarPlaca("abc1234")).toBe("ABC-1234");
    expect(formatarPlaca("abc1d23")).toBe("ABC1D23");
  });
});
