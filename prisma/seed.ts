import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed de demonstração: oficina + usuário demo + catálogo básico.
 * Login demo: demo@oficinapro.com.br / demo1234
 *
 * O usuário é criado via API do Better Auth (hash de senha correto);
 * a organização e vínculos são inseridos direto via Prisma.
 */
async function main() {
  const emailDemo = "demo@oficinapro.com.br";

  const usuarioExistente = await prisma.user.findUnique({
    where: { email: emailDemo },
  });
  if (usuarioExistente) {
    console.log("Seed já aplicado (usuário demo existe). Nada a fazer.");
    return;
  }

  // Importa o auth aqui (lazy) para não exigir env em builds sem seed.
  const { auth } = await import("../src/shared/lib/auth");
  const cadastro = await auth.api.signUpEmail({
    body: {
      name: "Administrador Demo",
      email: emailDemo,
      password: "demo1234",
    },
  });
  const userId = cadastro.user.id;

  const oficinaId = randomUUID();
  await prisma.organization.create({
    data: {
      id: oficinaId,
      name: "Oficina Demo",
      slug: `oficina-demo-${oficinaId.slice(0, 5)}`,
      createdAt: new Date(),
      members: {
        create: {
          id: randomUUID(),
          userId,
          role: "owner",
          createdAt: new Date(),
        },
      },
    },
  });

  await prisma.$transaction([
    prisma.oficinaConfig.create({
      data: {
        oficinaId,
        telefone: "(11) 3333-0000",
        cidade: "São Paulo",
        estado: "SP",
        valorHoraPadrao: 120,
      },
    }),
    prisma.funcionarioPerfil.create({
      data: { oficinaId, userId, cargo: "ADMIN" },
    }),
    prisma.centroCusto.create({ data: { oficinaId, nome: "Geral" } }),
  ]);

  await prisma.servico.createMany({
    data: [
      { oficinaId, nome: "Troca de óleo e filtro", precoBase: 80, tempoEstimadoMin: 40 },
      { oficinaId, nome: "Alinhamento e balanceamento", precoBase: 150, tempoEstimadoMin: 60 },
      { oficinaId, nome: "Revisão completa", precoBase: 350, tempoEstimadoMin: 180 },
      { oficinaId, nome: "Troca de pastilhas de freio", precoBase: 120, tempoEstimadoMin: 60 },
      { oficinaId, nome: "Diagnóstico eletrônico", precoBase: 100, tempoEstimadoMin: 45 },
      { oficinaId, nome: "Troca de correia dentada", precoBase: 280, tempoEstimadoMin: 150 },
    ],
  });

  const categoriaLubrificantes = await prisma.categoriaPeca.create({
    data: { oficinaId, nome: "Lubrificantes" },
  });
  const categoriaFiltros = await prisma.categoriaPeca.create({
    data: { oficinaId, nome: "Filtros" },
  });
  const categoriaFreios = await prisma.categoriaPeca.create({
    data: { oficinaId, nome: "Freios" },
  });

  const fornecedor = await prisma.fornecedor.create({
    data: {
      oficinaId,
      nome: "Auto Peças Central",
      telefone: "(11) 4444-1234",
      email: "vendas@autopecascentral.com.br",
    },
  });

  await prisma.peca.createMany({
    data: [
      { oficinaId, nome: "Óleo 5W30 sintético (litro)", codigo: "OL-5W30", unidade: "L", categoriaId: categoriaLubrificantes.id, fornecedorId: fornecedor.id, precoCusto: 28, precoVenda: 55, quantidade: 24, estoqueMinimo: 10 },
      { oficinaId, nome: "Filtro de óleo universal", codigo: "FO-001", categoriaId: categoriaFiltros.id, fornecedorId: fornecedor.id, precoCusto: 15, precoVenda: 35, quantidade: 12, estoqueMinimo: 5 },
      { oficinaId, nome: "Filtro de ar esportivo", codigo: "FA-010", categoriaId: categoriaFiltros.id, fornecedorId: fornecedor.id, precoCusto: 40, precoVenda: 89, quantidade: 4, estoqueMinimo: 3 },
      { oficinaId, nome: "Pastilha de freio dianteira", codigo: "PF-220", categoriaId: categoriaFreios.id, fornecedorId: fornecedor.id, precoCusto: 60, precoVenda: 130, quantidade: 8, estoqueMinimo: 4 },
      { oficinaId, nome: "Fluido de freio DOT4 (500ml)", codigo: "FF-500", categoriaId: categoriaFreios.id, fornecedorId: fornecedor.id, precoCusto: 18, precoVenda: 42, quantidade: 2, estoqueMinimo: 6 },
    ],
  });

  const cliente1 = await prisma.cliente.create({
    data: {
      oficinaId,
      nome: "Carlos Pereira",
      tipo: "FISICA",
      cpfCnpj: "52998224725",
      telefone: "(11) 98765-4321",
      whatsapp: "(11) 98765-4321",
      email: "carlos@example.com",
      cidade: "São Paulo",
      estado: "SP",
    },
  });
  const cliente2 = await prisma.cliente.create({
    data: {
      oficinaId,
      nome: "Transportes Rápido Ltda",
      tipo: "JURIDICA",
      cpfCnpj: "11222333000181",
      telefone: "(11) 3222-8899",
      email: "frota@rapido.com.br",
      cidade: "Guarulhos",
      estado: "SP",
    },
  });

  await prisma.veiculo.createMany({
    data: [
      { oficinaId, clienteId: cliente1.id, tipo: "CARRO", placa: "ABC1D23", marca: "Volkswagen", modelo: "Gol 1.6", ano: 2019, anoModelo: 2020, cor: "Prata", quilometragem: 68000, combustivel: "FLEX", cambio: "MANUAL" },
      { oficinaId, clienteId: cliente1.id, tipo: "MOTO", placa: "XYZ4E56", marca: "Honda", modelo: "CG 160 Titan", ano: 2022, anoModelo: 2022, cor: "Vermelha", quilometragem: 15000, combustivel: "GASOLINA" },
      { oficinaId, clienteId: cliente2.id, tipo: "CARRO", placa: "DEF5678", marca: "Fiat", modelo: "Fiorino Furgão", ano: 2021, anoModelo: 2021, cor: "Branca", quilometragem: 95000, combustivel: "FLEX", cambio: "MANUAL" },
    ],
  });

  const hoje = new Date();
  await prisma.agendamento.create({
    data: {
      oficinaId,
      clienteId: cliente1.id,
      tipo: "REVISAO",
      titulo: "Revisão dos 70 mil km — Gol",
      inicio: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 15, 0),
      status: "AGENDADO",
    },
  });

  console.log("Seed aplicado com sucesso.");
  console.log("Login demo: demo@oficinapro.com.br / demo1234");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
