"use server";

import { guardPermissao, requireOficina } from "@/shared/lib/session";
import {
  gerarMensagemWhatsApp,
  gerarSugestaoDiagnostico,
  iaDisponivel,
} from "@/shared/lib/ai";
import { formatarMoeda, paraNumero } from "@/shared/utils/moeda";
import { formatarPlaca } from "@/shared/utils/placa";

export interface ResultadoIA {
  ok: boolean;
  erro?: string;
  texto?: string;
}

export async function sugerirDiagnosticoIAAction(
  osId: string
): Promise<ResultadoIA> {
  const ctx = await requireOficina();
  const negado = await guardPermissao(ctx, "ordens", "EDITAR");
  if (negado) return negado;
  if (!iaDisponivel()) {
    return { ok: false, erro: "IA não configurada (defina ANTHROPIC_API_KEY)." };
  }
  const os = await ctx.db.ordemServico.findUnique({
    where: { id: osId },
    include: {
      veiculo: true,
      servicosOS: { where: { deletedAt: null }, select: { descricao: true } },
    },
  });
  if (!os) return { ok: false, erro: "OS não encontrada." };

  const historico = await ctx.db.oSServico.findMany({
    where: {
      ordemServico: { veiculoId: os.veiculoId, id: { not: os.id } },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { descricao: true },
  });

  try {
    const texto = await gerarSugestaoDiagnostico({
      veiculo: `${[os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ")} ${os.veiculo.ano ?? ""} (${os.veiculo.tipo === "MOTO" ? "moto" : "carro"})`.trim(),
      quilometragem: os.veiculo.quilometragem,
      problemaRelatado: os.descricaoProblema,
      historicoServicos: historico.map((s) => s.descricao),
    });
    return { ok: true, texto };
  } catch (erro) {
    console.error("Falha na IA (diagnóstico):", erro);
    return { ok: false, erro: "A IA não respondeu. Tente novamente em instantes." };
  }
}

export async function gerarMensagemWhatsAppIAAction(
  osId: string
): Promise<ResultadoIA> {
  const ctx = await requireOficina();
  // Mensagem ao cliente contém valores e link de aprovação.
  const negado = await guardPermissao(ctx, "ordens", "ENVIAR_APROVACAO");
  if (negado) return negado;
  if (!iaDisponivel()) {
    return { ok: false, erro: "IA não configurada (defina ANTHROPIC_API_KEY)." };
  }
  const os = await ctx.db.ordemServico.findUnique({
    where: { id: osId },
    include: {
      cliente: { select: { nome: true } },
      veiculo: { select: { marca: true, modelo: true, placa: true } },
      servicosOS: { where: { deletedAt: null }, select: { descricao: true } },
      pecasOS: { where: { deletedAt: null }, select: { descricao: true } },
      aprovacoes: {
        where: { status: "PENDENTE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!os) return { ok: false, erro: "OS não encontrada." };

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const aprovacao = os.aprovacoes[0];

  try {
    const texto = await gerarMensagemWhatsApp({
      cliente: os.cliente.nome,
      veiculo: `${[os.veiculo.marca, os.veiculo.modelo].filter(Boolean).join(" ")} ${formatarPlaca(os.veiculo.placa)}`,
      numeroOS: `#${String(os.numero).padStart(4, "0")}`,
      totalFormatado: formatarMoeda(paraNumero(os.total)),
      linkAprovacao: aprovacao ? `${base}/aprovacao/${aprovacao.token}` : null,
      itens: [
        ...os.servicosOS.map((s) => s.descricao),
        ...os.pecasOS.map((p) => p.descricao),
      ],
    });
    return { ok: true, texto };
  } catch (erro) {
    console.error("Falha na IA (mensagem):", erro);
    return { ok: false, erro: "A IA não respondeu. Tente novamente em instantes." };
  }
}
