import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { TipoMidia } from "@prisma/client";
import type { ContextoOficina } from "./session";
import { storage } from "./storage";

const EXTENSOES_IMAGEM = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const EXTENSOES_VIDEO = new Set([".mp4", ".webm", ".mov"]);
const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB por arquivo

export class ArquivoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ArquivoInvalidoError";
  }
}

/**
 * Salva um arquivo enviado via FormData e registra a Midia do tenant.
 * `entidade`/`entidadeId` apontam para o dono lógico (checkin, os, cliente…).
 */
export async function salvarMidia(
  ctx: ContextoOficina,
  arquivo: File,
  entidade: string,
  entidadeId: string,
  tipo?: TipoMidia
) {
  if (arquivo.size === 0) throw new ArquivoInvalidoError("Arquivo vazio.");
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new ArquivoInvalidoError(
      `Arquivo ${arquivo.name} excede o limite de 10 MB.`
    );
  }
  const extensao = path.extname(arquivo.name).toLowerCase() || ".bin";
  const ehImagem = EXTENSOES_IMAGEM.has(extensao);
  const ehVideo = EXTENSOES_VIDEO.has(extensao);
  if (!ehImagem && !ehVideo && extensao !== ".pdf") {
    throw new ArquivoInvalidoError(
      `Formato não suportado (${extensao}). Use imagens, vídeos ou PDF.`
    );
  }

  const caminho = `${ctx.oficinaId}/${entidade}/${entidadeId}/${randomUUID()}${extensao}`;
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const salvo = await storage.salvar(
    caminho,
    buffer,
    arquivo.type || "application/octet-stream"
  );

  return ctx.db.midia.create({
    data: {
      oficinaId: ctx.oficinaId,
      tipo: tipo ?? (ehVideo ? "VIDEO" : ehImagem ? "FOTO" : "DOCUMENTO"),
      url: salvo.url,
      nome: arquivo.name,
      entidade,
      entidadeId,
    },
  });
}

/** Salva uma assinatura capturada em canvas (data URL PNG). */
export async function salvarAssinatura(
  ctx: ContextoOficina,
  dataUrl: string,
  entidade: string,
  entidadeId: string
): Promise<string> {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match) throw new ArquivoInvalidoError("Assinatura inválida.");
  const buffer = Buffer.from(match[1]!, "base64");
  if (buffer.length > 2 * 1024 * 1024) {
    throw new ArquivoInvalidoError("Assinatura excede o limite de 2 MB.");
  }
  const caminho = `${ctx.oficinaId}/${entidade}/${entidadeId}/assinatura-${randomUUID()}.png`;
  const salvo = await storage.salvar(caminho, buffer, "image/png");
  await ctx.db.midia.create({
    data: {
      oficinaId: ctx.oficinaId,
      tipo: "ASSINATURA",
      url: salvo.url,
      nome: "assinatura.png",
      entidade,
      entidadeId,
    },
  });
  return salvo.url;
}
