import { NextRequest, NextResponse } from "next/server";
import { getSessao } from "@/shared/lib/session";
import { storage, validarAssinaturaArquivo } from "@/shared/lib/storage";

/**
 * Serve arquivos do storage. Acesso permitido quando:
 * 1. a URL traz assinatura HMAC válida (?exp=&sig=) — páginas públicas; ou
 * 2. o usuário está autenticado E o arquivo pertence à sua oficina ativa
 *    (o primeiro segmento do caminho é sempre o oficinaId).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caminho: string[] }> }
) {
  const { caminho } = await params;
  const caminhoCompleto = caminho.join("/");

  const url = request.nextUrl;
  const assinaturaValida = validarAssinaturaArquivo(
    caminhoCompleto,
    url.searchParams.get("exp"),
    url.searchParams.get("sig")
  );

  if (!assinaturaValida) {
    const sessao = await getSessao();
    const oficinaId = sessao?.session.activeOrganizationId;
    if (!oficinaId || caminho[0] !== oficinaId) {
      return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
    }
  }

  try {
    const { conteudo, contentType } = await storage.ler(caminhoCompleto);
    return new NextResponse(new Uint8Array(conteudo), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ erro: "Arquivo não encontrado." }, { status: 404 });
  }
}
