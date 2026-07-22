import type { Metadata } from "next";
import { Suspense } from "react";
import { requireOficina } from "@/shared/lib/session";
import { prisma } from "@/shared/lib/prisma";
import { paraNumero } from "@/shared/utils/moeda";
import {
  EquipeConteudo,
  type MembroLinha,
} from "@/modules/equipe/components/equipe-conteudo";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Equipe" };

async function ConteudoEquipe() {
  const { db, oficinaId } = await requireOficina();

  const [membros, perfis, osFinalizadas] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: oficinaId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.funcionarioPerfil.findMany(),
    db.ordemServico.findMany({
      where: { status: { in: ["FINALIZADO", "ENTREGUE"] }, mecanicoId: { not: null } },
      select: { mecanicoId: true, total: true },
    }),
  ]);

  const perfilPorUsuario = new Map(perfis.map((p) => [p.userId, p]));
  const statsPorUsuario = new Map<string, { ordens: number; receita: number }>();
  for (const os of osFinalizadas) {
    const atual = statsPorUsuario.get(os.mecanicoId!) ?? { ordens: 0, receita: 0 };
    atual.ordens += 1;
    atual.receita += paraNumero(os.total);
    statsPorUsuario.set(os.mecanicoId!, atual);
  }

  const linhas: MembroLinha[] = membros.map((membro) => {
    const perfil = perfilPorUsuario.get(membro.userId);
    const stats = statsPorUsuario.get(membro.userId);
    return {
      userId: membro.userId,
      nome: membro.user.name,
      email: membro.user.email,
      cargo: perfil?.cargo ?? null,
      especialidade: perfil?.especialidade ?? null,
      comissaoPercent: paraNumero(perfil?.comissaoPercent),
      salario: perfil?.salario != null ? paraNumero(perfil.salario) : null,
      telefone: perfil?.telefone ?? null,
      ativo: perfil?.ativo ?? true,
      osFinalizadas: stats?.ordens ?? 0,
      receitaGerada: Math.round((stats?.receita ?? 0) * 100) / 100,
    };
  });

  return <EquipeConteudo membros={linhas} />;
}

export default function EquipePage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <ConteudoEquipe />
      </Suspense>
    </div>
  );
}
