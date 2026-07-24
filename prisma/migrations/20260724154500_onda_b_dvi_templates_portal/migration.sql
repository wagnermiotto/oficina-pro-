-- CreateEnum
CREATE TYPE "StatusChecklist" AS ENUM ('NAO_VERIFICADO', 'OK', 'ATENCAO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "TipoItemTemplate" AS ENUM ('SERVICO', 'PECA');

-- AlterTable
ALTER TABLE "ordem_servico" ADD COLUMN     "portalToken" TEXT;

-- CreateTable
CREATE TABLE "checklist_os" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "item" TEXT NOT NULL,
    "status" "StatusChecklist" NOT NULL DEFAULT 'NAO_VERIFICADO',
    "observacao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "checklist_os_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_servico" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipoVeiculo" "TipoVeiculo",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "template_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_servico_item" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "templateId" UUID NOT NULL,
    "tipo" "TipoItemTemplate" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantidade" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "pecaId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "template_servico_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_os_oficinaId_ordemServicoId_idx" ON "checklist_os"("oficinaId", "ordemServicoId");

-- CreateIndex
CREATE INDEX "template_servico_oficinaId_nome_idx" ON "template_servico"("oficinaId", "nome");

-- CreateIndex
CREATE INDEX "template_servico_item_oficinaId_templateId_idx" ON "template_servico_item"("oficinaId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ordem_servico_portalToken_key" ON "ordem_servico"("portalToken");

-- AddForeignKey
ALTER TABLE "checklist_os" ADD CONSTRAINT "checklist_os_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_os" ADD CONSTRAINT "checklist_os_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_servico" ADD CONSTRAINT "template_servico_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_servico_item" ADD CONSTRAINT "template_servico_item_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_servico_item" ADD CONSTRAINT "template_servico_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_servico_item" ADD CONSTRAINT "template_servico_item_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

