-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVO', 'PENDENTE', 'ATRASADO', 'BLOQUEADO', 'SUSPENSO', 'CANCELADO');

-- CreateTable
CREATE TABLE "plano" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "precoMensal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurso_plano" (
    "id" UUID NOT NULL,
    "planoId" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurso_plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinatura" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "planoId" UUID NOT NULL,
    "status" "StatusAssinatura" NOT NULL DEFAULT 'PENDENTE',
    "vencimento" TIMESTAMP(3) NOT NULL,
    "diasBloqueio" INTEGER NOT NULL DEFAULT 7,
    "ultimoPagamentoEm" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plataforma_admin" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plataforma_admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plano_nome_key" ON "plano"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "recurso_plano_planoId_chave_key" ON "recurso_plano"("planoId", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "assinatura_oficinaId_key" ON "assinatura"("oficinaId");

-- CreateIndex
CREATE INDEX "assinatura_status_vencimento_idx" ON "assinatura"("status", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "plataforma_admin_userId_key" ON "plataforma_admin"("userId");

-- AddForeignKey
ALTER TABLE "recurso_plano" ADD CONSTRAINT "recurso_plano_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinatura" ADD CONSTRAINT "assinatura_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
