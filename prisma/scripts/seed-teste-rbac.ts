/**
 * Seed de VERIFICAÇÃO da Onda D (RBAC) — cria um usuário Mecânico de teste na
 * Oficina Demo e atribui a OS mais recente a ele, para validar em produção:
 * menu filtrado, escopo "minhas OS", valores ocultos e /acesso-restrito.
 *
 * Executar: npx tsx prisma/scripts/seed-teste-rbac.ts
 * Limpar depois (lançamento): remover mecanico.teste@oficinapro.com.br.
 */
import { auth } from "../../src/shared/lib/auth";
import { prisma } from "../../src/shared/lib/prisma";

const EMAIL = "mecanico.teste@oficinapro.com.br";
const SENHA = "teste1234";

async function main() {
  const oficina = await prisma.organization.findFirst({
    where: { name: "Oficina Demo" },
    select: { id: true, name: true },
  });
  if (!oficina) throw new Error("Oficina Demo não encontrada.");

  let usuario = await prisma.user.findFirst({ where: { email: EMAIL } });
  if (!usuario) {
    await auth.api.signUpEmail({
      body: { name: "Mecânico Teste", email: EMAIL, password: SENHA },
    });
    usuario = await prisma.user.findFirst({ where: { email: EMAIL } });
    if (!usuario) throw new Error("Falha ao criar o usuário de teste.");
    console.log(`Usuário criado: ${EMAIL} / ${SENHA}`);
  } else {
    console.log(`Usuário já existe: ${EMAIL}`);
  }

  const member = await prisma.member.findFirst({
    where: { organizationId: oficina.id, userId: usuario.id },
  });
  if (!member) {
    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: oficina.id,
        userId: usuario.id,
        role: "member",
        createdAt: new Date(),
      },
    });
    console.log("Vinculado como member da Oficina Demo.");
  }

  const perfilMecanico = await prisma.perfilAcesso.findFirst({
    where: { oficinaId: oficina.id, chave: "MECANICO", deletedAt: null },
    select: { id: true },
  });
  if (!perfilMecanico) throw new Error("Perfil MECANICO não semeado.");

  await prisma.funcionarioPerfil.upsert({
    where: { oficinaId_userId: { oficinaId: oficina.id, userId: usuario.id } },
    create: {
      oficinaId: oficina.id,
      userId: usuario.id,
      cargo: "MECANICO",
      perfilAcessoId: perfilMecanico.id,
      especialidade: "Verificação RBAC",
    },
    update: { perfilAcessoId: perfilMecanico.id, ativo: true, deletedAt: null },
  });
  console.log("FuncionarioPerfil → perfil Mecânico.");

  const os = await prisma.ordemServico.findFirst({
    where: { oficinaId: oficina.id, deletedAt: null },
    orderBy: { numero: "desc" },
    select: { id: true, numero: true },
  });
  if (os) {
    await prisma.ordemServico.update({
      where: { id: os.id },
      data: { mecanicoId: usuario.id },
    });
    console.log(`OS #${String(os.numero).padStart(4, "0")} atribuída ao mecânico de teste.`);
  }

  const total = await prisma.ordemServico.count({
    where: { oficinaId: oficina.id, deletedAt: null },
  });
  console.log(`Total de OS na demo: ${total} (mecânico deve ver só 1).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
