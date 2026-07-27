import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins/organization";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./prisma";

/**
 * Better Auth: e-mail/senha + organizações (multi-tenant).
 * A Organization É a oficina; a sessão carrega activeOrganizationId.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    // Em produção o app roda atrás do proxy da Hostinger, então o IP do
    // socket é sempre o do proxy (::1). Estes headers trazem o IP real do
    // cliente — necessário para o rate limiting funcionar por usuário.
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Ao criar a sessão (login), ativa automaticamente a primeira
        // oficina do usuário — evita estado "logado sem tenant".
        before: async (session) => {
          const membro = await prisma.member.findFirst({
            where: { userId: session.userId },
            orderBy: { createdAt: "asc" },
          });
          return {
            data: {
              ...session,
              activeOrganizationId: membro?.organizationId ?? null,
            },
          };
        },
        // Auditoria de LOGIN (exigência da Matriz). A sessão já carrega
        // IP/user-agent; nunca lança para não quebrar o login.
        after: async (session) => {
          try {
            // activeOrganizationId é campo custom do plugin — o tipo do hook
            // não o conhece.
            const oficinaId =
              typeof session.activeOrganizationId === "string"
                ? session.activeOrganizationId
                : null;
            await prisma.auditLog.create({
              data: {
                oficinaId,
                usuarioId: session.userId,
                acao: "LOGIN",
                entidade: "sessao",
                entidadeId: session.id,
                ip: session.ipAddress ?? null,
                userAgent: session.userAgent ?? null,
              },
            });
          } catch (erro) {
            console.error("Falha ao auditar login:", erro);
          }
        },
      },
    },
  },
  plugins: [
    organization(),
    // nextCookies precisa ser o último plugin: propaga Set-Cookie em Server Actions.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
