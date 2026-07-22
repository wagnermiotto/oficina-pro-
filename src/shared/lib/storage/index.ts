import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Storage de arquivos atrás de interface única.
 * Driver "local": grava em ./uploads (dev / instância única).
 * Driver "supabase": Supabase Storage (produção) — exige SUPABASE_SECRET_KEY.
 *
 * URLs servidas por /api/arquivos/[...caminho], com verificação de sessão
 * OU assinatura HMAC (para páginas públicas, ex.: aprovação de orçamento).
 */

export interface ArquivoSalvo {
  /** Caminho lógico (chave) do arquivo, ex.: "oficinaId/checkins/id/foto.jpg". */
  caminho: string;
  /** URL interna para exibição autenticada. */
  url: string;
}

export interface StorageService {
  salvar(
    caminho: string,
    conteudo: Buffer,
    contentType: string
  ): Promise<ArquivoSalvo>;
  ler(caminho: string): Promise<{ conteudo: Buffer; contentType: string }>;
}

const RAIZ_UPLOADS = path.join(process.cwd(), "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function contentTypePorExtensao(caminho: string): string {
  return CONTENT_TYPES[path.extname(caminho).toLowerCase()] ?? "application/octet-stream";
}

/** Impede path traversal: só letras/números/-/_/. em cada segmento. */
export function sanitizarCaminho(caminho: string): string {
  const segmentos = caminho
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/[^a-zA-Z0-9._-]/g, "_"));
  if (segmentos.some((s) => s === "." || s === "..")) {
    throw new Error("Caminho de arquivo inválido.");
  }
  return segmentos.join("/");
}

class LocalStorage implements StorageService {
  async salvar(caminho: string, conteudo: Buffer): Promise<ArquivoSalvo> {
    const limpo = sanitizarCaminho(caminho);
    const destino = path.join(RAIZ_UPLOADS, limpo);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, conteudo);
    return { caminho: limpo, url: `/api/arquivos/${limpo}` };
  }

  async ler(caminho: string) {
    const limpo = sanitizarCaminho(caminho);
    const conteudo = await readFile(path.join(RAIZ_UPLOADS, limpo));
    return { conteudo, contentType: contentTypePorExtensao(limpo) };
  }
}

class SupabaseStorage implements StorageService {
  private get config() {
    const url = process.env.SUPABASE_URL;
    const chave = process.env.SUPABASE_SECRET_KEY;
    if (!url || !chave) {
      throw new Error(
        "STORAGE_DRIVER=supabase exige SUPABASE_URL e SUPABASE_SECRET_KEY no .env."
      );
    }
    return { url, chave };
  }

  async salvar(
    caminho: string,
    conteudo: Buffer,
    contentType: string
  ): Promise<ArquivoSalvo> {
    const { url, chave } = this.config;
    const limpo = sanitizarCaminho(caminho);
    const resposta = await fetch(`${url}/storage/v1/object/arquivos/${limpo}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(conteudo),
    });
    if (!resposta.ok) {
      throw new Error(`Falha no upload para o Supabase Storage: ${resposta.status}`);
    }
    return { caminho: limpo, url: `/api/arquivos/${limpo}` };
  }

  async ler(caminho: string) {
    const { url, chave } = this.config;
    const limpo = sanitizarCaminho(caminho);
    const resposta = await fetch(`${url}/storage/v1/object/arquivos/${limpo}`, {
      headers: { Authorization: `Bearer ${chave}` },
    });
    if (!resposta.ok) {
      throw new Error(`Arquivo não encontrado no Supabase Storage: ${resposta.status}`);
    }
    return {
      conteudo: Buffer.from(await resposta.arrayBuffer()),
      contentType:
        resposta.headers.get("content-type") ?? contentTypePorExtensao(limpo),
    };
  }
}

export const storage: StorageService =
  process.env.STORAGE_DRIVER === "supabase"
    ? new SupabaseStorage()
    : new LocalStorage();

// --- URLs assinadas (acesso público temporário, ex.: página de aprovação) ---

function chaveAssinatura(): string {
  const segredo = process.env.BETTER_AUTH_SECRET;
  if (!segredo) throw new Error("BETTER_AUTH_SECRET ausente.");
  return segredo;
}

/** Gera URL com assinatura HMAC válida até `expiraEmMs` (padrão 7 dias). */
export function assinarUrlArquivo(
  caminho: string,
  expiraEmMs = 7 * 24 * 60 * 60 * 1000
): string {
  const limpo = sanitizarCaminho(caminho);
  const expira = Date.now() + expiraEmMs;
  const mac = createHmac("sha256", chaveAssinatura())
    .update(`${limpo}:${expira}`)
    .digest("base64url");
  return `/api/arquivos/${limpo}?exp=${expira}&sig=${mac}`;
}

export function validarAssinaturaArquivo(
  caminho: string,
  exp: string | null,
  sig: string | null
): boolean {
  if (!exp || !sig) return false;
  const expira = Number(exp);
  if (!Number.isFinite(expira) || expira < Date.now()) return false;
  const esperado = createHmac("sha256", chaveAssinatura())
    .update(`${sanitizarCaminho(caminho)}:${expira}`)
    .digest("base64url");
  const a = Buffer.from(esperado);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
