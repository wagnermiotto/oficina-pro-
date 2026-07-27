/**
 * Migração one-shot do RBAC dinâmico (Onda D — R1).
 *
 * Para cada Organization existente:
 *  1. Semeia os 7 perfis padrão (idempotente por chave).
 *  2. Vincula cada FuncionarioPerfil ativo sem perfilAcessoId ao perfil
 *     correspondente ao seu Cargo legado.
 *
 * Executar com: npx tsx prisma/scripts/migrar-rbac.ts
 * (usa DATABASE_URL/DIRECT_URL do .env — o client padrão do projeto)
 *
 * Critério de sucesso: imprime "orfaos: 0" ao final.
 */
import { prisma } from "../../src/shared/lib/prisma";
import { semearPerfisPadrao } from "../../src/modules/permissoes/services/permissoes-service";

const MAPA_CARGO_CHAVE: Record<string, string> = {
  ADMIN: "PROPRIETARIO",
  GERENTE: "GERENTE",
  RECEPCIONISTA: "ATENDENTE",
  MECANICO: "MECANICO",
  FINANCEIRO: "FINANCEIRO",
  ESTOQUISTA: "ESTOQUISTA",
};

async function main() {
  const oficinas = await prisma.organization.findMany({ select: { id: true, name: true } });
  console.log(`Oficinas: ${oficinas.length}`);

  for (const oficina of oficinas) {
    await semearPerfisPadrao(prisma, oficina.id);

    const perfis = await prisma.perfilAcesso.findMany({
      where: { oficinaId: oficina.id, chave: { not: null }, deletedAt: null },
      select: { id: true, chave: true },
    });
    const porChave = new Map(perfis.map((p) => [p.chave as string, p.id]));

    const funcionarios = await prisma.funcionarioPerfil.findMany({
      where: { oficinaId: oficina.id, perfilAcessoId: null, deletedAt: null },
      select: { id: true, cargo: true, userId: true },
    });

    for (const f of funcionarios) {
      const chaveDestino = MAPA_CARGO_CHAVE[f.cargo] ?? "MECANICO";
      const perfilId = porChave.get(chaveDestino);
      if (!perfilId) {
        console.error(`  !! ${oficina.name}: perfil ${chaveDestino} não encontrado`);
        continue;
      }
      await prisma.funcionarioPerfil.update({
        where: { id: f.id },
        data: { perfilAcessoId: perfilId },
      });
      console.log(`  ${oficina.name}: ${f.userId} (${f.cargo}) -> ${chaveDestino}`);
    }
  }

  const orfaos = await prisma.funcionarioPerfil.count({
    where: { perfilAcessoId: null, deletedAt: null, ativo: true },
  });
  const totalPerfis = await prisma.perfilAcesso.count({ where: { deletedAt: null } });
  console.log(`\nperfis totais: ${totalPerfis}`);
  console.log(`orfaos: ${orfaos}`);
  if (orfaos > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
