import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/shared/lib/prisma";
import { tenantDb } from "@/shared/lib/tenant-db";
import { paraNumero } from "@/shared/utils/moeda";
import {
  atualizarItemChecklist,
  criarChecklist,
  ITENS_CHECKLIST_PADRAO,
  listarChecklist,
} from "./checklist-service";
import { aplicarTemplateNaOS, criarTemplate } from "./template-service";
import { gerarPortalToken, obterPortalPorToken, PROGRESSO_OS } from "./portal-service";

/**
 * Onda B: checklist DVI por tipo de veículo, aplicação de template numa OS e
 * portal do cliente (token permanente + leitura pública com progresso).
 */

const oficinaId = `test-onda-b-${randomUUID().slice(0, 8)}`;
const db = tenantDb(oficinaId);
let clienteId = "";
let veiculoId = "";
let osId = "";

beforeAll(async () => {
  await prisma.organization.create({
    data: { id: oficinaId, name: "Oficina Onda B", slug: oficinaId, createdAt: new Date() },
  });
  await prisma.oficinaConfig.create({ data: { oficinaId } });
  const cliente = await prisma.cliente.create({ data: { oficinaId, nome: "Cliente B" } });
  clienteId = cliente.id;
  const veiculo = await prisma.veiculo.create({
    data: { oficinaId, clienteId, placa: "OBX1A23", tipo: "MOTO", modelo: "CG 160" },
  });
  veiculoId = veiculo.id;
  const os = await prisma.ordemServico.create({
    data: { oficinaId, numero: 1, clienteId, veiculoId, status: "EM_EXECUCAO" },
  });
  osId = os.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: oficinaId } });
  await prisma.$disconnect();
});

describe("checklist DVI", () => {
  it("gera itens padrão pelo tipo do veículo (moto) e é idempotente", async () => {
    const itens = await criarChecklist(db, oficinaId, osId);
    expect(itens.length).toBe(ITENS_CHECKLIST_PADRAO.MOTO.length);
    // Rodar de novo não duplica.
    const denovo = await criarChecklist(db, oficinaId, osId);
    expect(denovo.length).toBe(itens.length);
  });

  it("atualiza o status de um item", async () => {
    const itens = await listarChecklist(db, osId);
    await atualizarItemChecklist(db, itens[0]!.id, "REPROVADO", "Pastilha no fim");
    const atualizado = await listarChecklist(db, osId);
    expect(atualizado[0]!.status).toBe("REPROVADO");
    expect(atualizado[0]!.observacao).toBe("Pastilha no fim");
  });
});

describe("template de serviço", () => {
  it("aplica um pacote inserindo serviços e peças na OS", async () => {
    const template = await criarTemplate(db, oficinaId, {
      nome: "Revisão básica",
      itens: [
        { tipo: "SERVICO", descricao: "Troca de óleo", valor: 80, quantidade: 1 },
        { tipo: "PECA", descricao: "Óleo 1L", valor: 40, quantidade: 3 },
      ],
    });
    const inseridos = await aplicarTemplateNaOS(db, oficinaId, osId, template.id);
    expect(inseridos).toBe(2);

    const [servicos, pecas] = await Promise.all([
      db.oSServico.findMany({ where: { ordemServicoId: osId, deletedAt: null } }),
      db.oSPeca.findMany({ where: { ordemServicoId: osId, deletedAt: null } }),
    ]);
    expect(servicos.some((s) => s.descricao === "Troca de óleo")).toBe(true);
    const oleo = pecas.find((p) => p.descricao === "Óleo 1L");
    expect(oleo).toBeDefined();
    expect(paraNumero(oleo!.quantidade)).toBe(3);
  });
});

describe("portal do cliente", () => {
  it("gera token permanente (idempotente) e lê publicamente com progresso", async () => {
    const token1 = await gerarPortalToken(db, osId);
    const token2 = await gerarPortalToken(db, osId);
    expect(token1).toBe(token2);
    expect(token1.length).toBeGreaterThan(15);

    const dados = await obterPortalPorToken(token1);
    expect(dados).not.toBeNull();
    expect(dados!.os.numero).toBe(1);
    expect(PROGRESSO_OS[dados!.os.status]).toBe(70); // EM_EXECUCAO
  });

  it("token inexistente retorna null", async () => {
    expect(await obterPortalPorToken("token-que-nao-existe")).toBeNull();
  });
});
