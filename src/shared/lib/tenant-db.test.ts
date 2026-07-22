import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { tenantDb, TenantViolationError } from "./tenant-db";

/**
 * Teste de integração do isolamento multi-tenant (roda contra o banco real).
 * Cria duas oficinas com dados e garante que uma NUNCA enxerga a outra.
 */

const sufixo = randomUUID().slice(0, 8);
const oficinaA = `test-oficina-a-${sufixo}`;
const oficinaB = `test-oficina-b-${sufixo}`;
let clienteAId = "";
let clienteBId = "";

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      { id: oficinaA, name: "Oficina A (teste)", slug: oficinaA, createdAt: new Date() },
      { id: oficinaB, name: "Oficina B (teste)", slug: oficinaB, createdAt: new Date() },
    ],
  });
  const clienteA = await prisma.cliente.create({
    data: { oficinaId: oficinaA, nome: "Cliente da Oficina A" },
  });
  const clienteB = await prisma.cliente.create({
    data: { oficinaId: oficinaB, nome: "Cliente da Oficina B" },
  });
  clienteAId = clienteA.id;
  clienteBId = clienteB.id;
});

afterAll(async () => {
  // Cascade das FKs remove clientes e demais registros dos tenants de teste.
  await prisma.organization.deleteMany({
    where: { id: { in: [oficinaA, oficinaB] } },
  });
  await prisma.$disconnect();
});

describe("tenantDb — isolamento entre oficinas", () => {
  it("findMany devolve apenas os dados do próprio tenant", async () => {
    const clientes = await tenantDb(oficinaA).cliente.findMany();
    expect(clientes).toHaveLength(1);
    expect(clientes[0]!.nome).toBe("Cliente da Oficina A");
  });

  it("findUnique de registro alheio devolve null", async () => {
    const alheio = await tenantDb(oficinaA).cliente.findUnique({
      where: { id: clienteBId },
    });
    expect(alheio).toBeNull();
  });

  it("update de registro alheio lança TenantViolationError", async () => {
    await expect(
      tenantDb(oficinaA).cliente.update({
        where: { id: clienteBId },
        data: { nome: "Invadido" },
      })
    ).rejects.toThrow(TenantViolationError);
    const intacto = await prisma.cliente.findUnique({ where: { id: clienteBId } });
    expect(intacto!.nome).toBe("Cliente da Oficina B");
  });

  it("delete de registro alheio lança TenantViolationError", async () => {
    await expect(
      tenantDb(oficinaA).cliente.delete({ where: { id: clienteBId } })
    ).rejects.toThrow(TenantViolationError);
  });

  it("create injeta o oficinaId do tenant automaticamente", async () => {
    const criado = await tenantDb(oficinaB).veiculo.create({
      data: {
        // oficinaId é injetado — informa apenas os campos de negócio.
        oficinaId: "ignorado-pela-extensao",
        clienteId: clienteBId,
        placa: "TST1A23",
      },
    });
    expect(criado.oficinaId).toBe(oficinaB);
  });

  it("updateMany não atravessa a fronteira do tenant", async () => {
    const resultado = await tenantDb(oficinaA).cliente.updateMany({
      where: {},
      data: { observacoes: "marcado" },
    });
    expect(resultado.count).toBe(1);
    const clienteB = await prisma.cliente.findUnique({ where: { id: clienteBId } });
    expect(clienteB!.observacoes).toBeNull();
  });

  it("count respeita o escopo do tenant", async () => {
    expect(await tenantDb(oficinaA).cliente.count()).toBe(1);
    expect(await tenantDb(oficinaB).cliente.count()).toBe(1);
  });

  it("soft delete: reads filtram deletedAt por padrão", async () => {
    const db = tenantDb(oficinaA);
    await db.cliente.update({
      where: { id: clienteAId },
      data: { deletedAt: new Date() },
    });
    expect(await db.cliente.findMany()).toHaveLength(0);
    // Com filtro explícito, o registro continua acessível (lixeira).
    const naLixeira = await db.cliente.findMany({
      where: { deletedAt: { not: null } },
    });
    expect(naLixeira).toHaveLength(1);
    await db.cliente.update({
      where: { id: clienteAId },
      data: { deletedAt: null },
    });
  });

  it("bloqueia models que não são de tenant", async () => {
    await expect(
      tenantDb(oficinaA).user.findMany()
    ).rejects.toThrow(/não é multi-tenant/);
  });
});
