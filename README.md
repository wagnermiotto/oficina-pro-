# OficinaPro — SaaS de Gestão de Oficinas Mecânicas

ERP multi-tenant para oficinas de carros e motos: clientes, veículos, check-in
com assinatura digital, ordens de serviço com aprovação on-line do cliente,
estoque, compras, financeiro, agenda, CRM, garantias, relatórios, BI e IA.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, proxy.ts)
- **React 19 + TypeScript strict + Tailwind CSS 4 + shadcn/ui**
- **Prisma 6 → PostgreSQL (Supabase)** — conexão via pooler (`.env`)
- **Better Auth** (e-mail/senha + organization plugin = multi-tenant)
- **@react-pdf/renderer** (PDF de OS), **recharts** (gráficos), **vitest** (testes)
- **@anthropic-ai/sdk** (IA — ativa somente com `ANTHROPIC_API_KEY`)

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL/DIRECT_URL/BETTER_AUTH_SECRET
npx prisma migrate dev
npm run db:seed        # cria oficina demo (demo@oficinapro.com.br / demo1234)
npm run dev
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (`prisma generate` + `next build`) |
| `npm test` | Testes (unitários + integração contra o banco do `.env`) |
| `npm run db:migrate` | Migrações Prisma |
| `npm run db:seed` | Seed demo |
| `npm run db:studio` | Prisma Studio |

## Arquitetura

- `src/app` — rotas (grupos `(auth)`, `(app)` protegido, `/aprovacao/[token]` público)
- `src/modules/<feature>` — `components/`, `actions/`, `services/`, `schemas/`
- `src/shared` — `lib/` (prisma, tenant-db, auth, storage, ai, audit), `components/`, `utils/`

### Multi-tenant

Toda tabela de negócio tem `oficinaId`. O isolamento é garantido em
[src/shared/lib/tenant-db.ts](src/shared/lib/tenant-db.ts): `tenantDb(oficinaId)`
injeta o tenant em todo create e restringe todo read/update/delete, com testes
dedicados em `tenant-db.test.ts`. Server Actions obtêm o client escopado via
`requireOficina()`; models de auth (User, Session, Organization…) usam o
`prisma` direto apenas nos services de auth.

### Integrações plugáveis (por variável de ambiente)

| Recurso | Driver dev | Produção |
|---|---|---|
| Storage de arquivos | local (`./uploads`) | Supabase Storage (`STORAGE_DRIVER=supabase` + `SUPABASE_SECRET_KEY`) |
| E-mail | console | Resend (`RESEND_API_KEY`) — pendente de implementação do adapter |
| IA | desativada | Claude API (`ANTHROPIC_API_KEY`) |

## Deploy (Vercel)

1. Importar o repositório na Vercel.
2. Configurar as variáveis do `.env` (produção usa `BETTER_AUTH_URL` e
   `NEXT_PUBLIC_APP_URL` com o domínio real).
3. `STORAGE_DRIVER=supabase` + `SUPABASE_SECRET_KEY` (o driver local não
   persiste em serverless).
4. Build command padrão (`npm run build`) já roda `prisma generate`.
