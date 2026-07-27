-- AlterTable
ALTER TABLE "funcionario_perfil" ADD COLUMN     "perfilAcessoId" UUID;

-- CreateTable
CREATE TABLE "perfil_acesso" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "chave" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "perfil_acesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissao_perfil" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "perfilId" UUID NOT NULL,
    "modulo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,

    CONSTRAINT "permissao_perfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "perfil_acesso_oficinaId_deletedAt_idx" ON "perfil_acesso"("oficinaId", "deletedAt");

-- CreateIndex
CREATE INDEX "permissao_perfil_oficinaId_idx" ON "permissao_perfil"("oficinaId");

-- CreateIndex
CREATE UNIQUE INDEX "permissao_perfil_perfilId_modulo_acao_key" ON "permissao_perfil"("perfilId", "modulo", "acao");

-- AddForeignKey
ALTER TABLE "funcionario_perfil" ADD CONSTRAINT "funcionario_perfil_perfilAcessoId_fkey" FOREIGN KEY ("perfilAcessoId") REFERENCES "perfil_acesso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_acesso" ADD CONSTRAINT "perfil_acesso_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissao_perfil" ADD CONSTRAINT "permissao_perfil_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissao_perfil" ADD CONSTRAINT "permissao_perfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfil_acesso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
