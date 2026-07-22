# Publicar na Hostinger (Node.js Web Apps)

> **Antes de tudo — o plano precisa suportar Node.js.**
> Só os planos **Business** e **Cloud** (Startup, Professional, Enterprise)
> rodam Node. Confira em hPanel → **Assinaturas**.
> Nos planos **Single** e **Premium** o Next.js não roda de jeito nenhum —
> nesse caso faça upgrade ou publique na **Vercel** (gratuita).

O banco é o **Supabase** (PostgreSQL, projeto `oficina-saas`, região São
Paulo), não o MySQL da Hostinger. As tabelas já existem com as migrações
aplicadas — **não há migração para rodar no deploy**.

---

## 1. Criar o bucket de arquivos no Supabase (obrigatório)

Na Hostinger o disco do app não é permanente, então fotos de check-in e
assinaturas precisam ir para o Supabase Storage:

1. Painel do Supabase → **Storage → New bucket**.
2. Nome: `arquivos` — exatamente assim (o código grava em
   `storage/v1/object/arquivos/...`).
3. Deixe como **privado** (o app serve os arquivos pela rota autenticada
   `/api/arquivos`, nunca por URL pública do bucket).

Depois pegue a **secret key** em **Project Settings → API keys** (a chave
`service_role`/secret, não a publishable) — ela vai na variável
`SUPABASE_SECRET_KEY` abaixo.

## 2. Criar o Web App

hPanel → **Websites → Adicionar site → Deploy Web App → GitHub**.

O repositório é `wagnermiotto/oficina-pro-` (privado), então a Hostinger vai
pedir autorização à sua conta do GitHub. Escolha a branch `main`.

Ela detecta Next.js sozinha: build `npm run build`, start `npm start`. Se
pedir configuração manual, use **Node 22** e diretório de saída `.next`.

## 3. Variáveis de ambiente (no painel do Web App)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `postgresql://prisma_app.fvaegmorivsnhprjygtw:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10` |
| `DIRECT_URL` | `postgresql://prisma_app.fvaegmorivsnhprjygtw:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres` |
| `BETTER_AUTH_SECRET` | **um segredo novo** (veja abaixo) |
| `BETTER_AUTH_URL` | `https://seu-dominio.com.br` (o endereço real do site) |
| `NEXT_PUBLIC_APP_URL` | o mesmo endereço real do site |
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_URL` | `https://fvaegmorivsnhprjygtw.supabase.co` |
| `SUPABASE_SECRET_KEY` | a secret key do passo 1 |
| `ANTHROPIC_API_KEY` | *(opcional)* habilita os recursos de IA |

A senha (`SENHA`) das duas URLs de banco é a mesma do `.env` local (role
`prisma_app`). **Use sempre o host do pooler** (`aws-0-sa-east-1.pooler...`):
o host direto `db.fvaegmorivsnhprjygtw.supabase.co` é só IPv6 e não conecta
da maioria dos servidores.

Gere o `BETTER_AUTH_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Não reaproveite o segredo do `.env` local** — ele é de desenvolvimento.

Nada mais precisa ser configurado: o `postinstall` roda `prisma generate` e o
`npm run build` já inclui a geração do client.

## 4. Antes de divulgar o endereço

1. **Remover ou trocar a senha do usuário demo.** Ele nasce como
   `demo@oficinapro.com.br` / `demo1234`, que está escrita no repositório —
   ou seja, é pública. Troque a senha pela tela de login ou apague o usuário
   no Supabase (Table Editor → `user`).
2. **Limpar os dados de teste.** O banco de produção é o mesmo usado no
   desenvolvimento — clientes, veículos e OS de exemplo vão junto. Apague-os
   pelas próprias telas do sistema (ou crie uma oficina nova pelo cadastro e
   ignore a "Oficina Demo").
3. **Criar a conta real da oficina** em `/cadastro` → onboarding.

## Conferir que subiu certo

1. Abrir o endereço → cai em `/login`.
2. Fazer login → dashboard carrega com os KPIs.
3. Criar cliente → veículo → check-in (com foto) → a foto deve abrir depois
   de salvar (prova de que o bucket `arquivos` está certo).
4. Criar uma OS, adicionar um serviço e gerar o link de aprovação → abrir o
   link numa **janela anônima** (sem login) → aprovar.
5. Baixar o PDF da OS.

## Se der erro de banco no build ou no primeiro acesso

1. **`DATABASE_URL`/`DIRECT_URL` estão no painel?** Sem elas o Prisma não
   conecta.
2. **O host é o do pooler (`aws-0-sa-east-1.pooler.supabase.com`)?** O host
   `db.*.supabase.co` falha com timeout em servidor sem IPv6.
3. **`BETTER_AUTH_SECRET` está definida?** Sem ela o login não inicia.
4. **A Hostinger está no commit mais recente?** Force o *Redeploy*.

## Referências

- Node.js na Hostinger: hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- Guia equivalente do site do enxoval: `Site enxoval/next-app/DEPLOY-HOSTINGER.md`
