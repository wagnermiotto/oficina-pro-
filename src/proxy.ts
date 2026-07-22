import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Checagem otimista de autenticação (Next 16: proxy substitui middleware).
 * Apenas verifica a existência do cookie de sessão — a validação real
 * acontece nos layouts/actions via requireSessao()/requireOficina().
 */
export function proxy(request: NextRequest) {
  const cookie = getSessionCookie(request);
  if (!cookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("de", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/veiculos/:path*",
    "/ordens/:path*",
    "/estoque/:path*",
    "/compras/:path*",
    "/financeiro/:path*",
    "/agenda/:path*",
    "/crm/:path*",
    "/relatorios/:path*",
    "/equipe/:path*",
    "/configuracoes/:path*",
    "/onboarding",
  ],
};
