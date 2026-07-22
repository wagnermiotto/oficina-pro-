"use server";

import { revalidatePath } from "next/cache";
import { requireOficina } from "@/shared/lib/session";
import { registrarAuditoria } from "@/shared/lib/audit";
import {
  ArquivoInvalidoError,
  salvarAssinatura,
  salvarMidia,
} from "@/shared/lib/midia-service";
import { checkInSchema } from "../schemas/checkin-schemas";

export interface ResultadoCheckIn {
  ok: boolean;
  erro?: string;
  id?: string;
}

/**
 * Cria o check-in do veículo. Recebe FormData:
 * - "dados": JSON validado pelo checkInSchema
 * - "fotos": arquivos de imagem/vídeo (0..n)
 */
export async function criarCheckInAction(
  veiculoId: string,
  formData: FormData
): Promise<ResultadoCheckIn> {
  const ctx = await requireOficina();

  const veiculo = await ctx.db.veiculo.findUnique({
    where: { id: veiculoId },
    select: { id: true, clienteId: true },
  });
  if (!veiculo) return { ok: false, erro: "Veículo não encontrado." };

  let dadosBrutos: unknown;
  try {
    dadosBrutos = JSON.parse(String(formData.get("dados") ?? "{}"));
  } catch {
    return { ok: false, erro: "Dados do check-in ilegíveis." };
  }
  const parse = checkInSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  const checkIn = await ctx.db.checkIn.create({
    data: {
      oficinaId: ctx.oficinaId,
      veiculoId: veiculo.id,
      clienteId: veiculo.clienteId,
      quilometragem: dados.quilometragem ?? null,
      nivelCombustivel: dados.nivelCombustivel ?? null,
      chaveReserva: dados.chaveReserva,
      estepe: dados.estepe,
      macaco: dados.macaco,
      triangulo: dados.triangulo,
      objetosDeixados: dados.objetosDeixados || null,
      observacoes: dados.observacoes || null,
      avarias: {
        create: dados.avarias.map((avaria) => ({
          oficinaId: ctx.oficinaId,
          local: avaria.local,
          tipo: avaria.tipo,
          descricao: avaria.descricao || null,
        })),
      },
    },
  });

  try {
    const fotos = formData
      .getAll("fotos")
      .filter((f): f is File => f instanceof File && f.size > 0);
    for (const foto of fotos) {
      await salvarMidia(ctx, foto, "checkin", checkIn.id);
    }
    if (dados.assinatura) {
      const url = await salvarAssinatura(ctx, dados.assinatura, "checkin", checkIn.id);
      await ctx.db.checkIn.update({
        where: { id: checkIn.id },
        data: { assinaturaUrl: url },
      });
    }
  } catch (erro) {
    if (erro instanceof ArquivoInvalidoError) {
      return { ok: false, erro: `Check-in salvo, mas: ${erro.message}`, id: checkIn.id };
    }
    throw erro;
  }

  if (dados.quilometragem != null) {
    await ctx.db.veiculo.update({
      where: { id: veiculo.id },
      data: { quilometragem: dados.quilometragem },
    });
  }

  await registrarAuditoria(ctx, {
    acao: "CREATE",
    entidade: "checkin",
    entidadeId: checkIn.id,
    depois: dados,
  });

  revalidatePath(`/veiculos/${veiculo.id}`);
  return { ok: true, id: checkIn.id };
}
