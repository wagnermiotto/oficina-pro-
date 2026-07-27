"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { requireSessao } from "@/shared/lib/session";
import { semearPerfisPadrao } from "@/modules/permissoes/services/permissoes-service";
import {
  onboardingSchema,
  type OnboardingInput,
} from "../schemas/auth-schemas";

function gerarSlug(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const sufixo = Math.random().toString(36).slice(2, 7);
  return `${base || "oficina"}-${sufixo}`;
}

export interface ResultadoAcao {
  erro?: string;
}

/**
 * Cria a oficina (organization) do usuário recém-cadastrado, define-a como
 * ativa na sessão e prepara os dados iniciais do tenant.
 */
export async function concluirOnboarding(
  dados: OnboardingInput
): Promise<ResultadoAcao> {
  const sessao = await requireSessao();
  const parse = onboardingSchema.safeParse(dados);
  if (!parse.success) {
    return { erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { nomeOficina, telefone, cidade, estado } = parse.data;

  const reqHeaders = await headers();
  const org = await auth.api.createOrganization({
    body: { name: nomeOficina, slug: gerarSlug(nomeOficina) },
    headers: reqHeaders,
  });
  if (!org) {
    return { erro: "Não foi possível criar a oficina. Tente novamente." };
  }

  await auth.api.setActiveOrganization({
    body: { organizationId: org.id },
    headers: reqHeaders,
  });

  await prisma.$transaction(async (tx) => {
    await tx.oficinaConfig.create({
      data: {
        oficinaId: org.id,
        telefone: telefone || null,
        cidade: cidade || null,
        estado: estado || null,
      },
    });
    // Perfis RBAC padrão da oficina; o fundador nasce como Proprietário.
    const proprietarioId = await semearPerfisPadrao(tx, org.id);
    await tx.funcionarioPerfil.create({
      data: {
        oficinaId: org.id,
        userId: sessao.user.id,
        cargo: "ADMIN",
        perfilAcessoId: proprietarioId,
      },
    });
    await tx.centroCusto.create({
      data: { oficinaId: org.id, nome: "Geral" },
    });
  });

  redirect("/dashboard");
}
