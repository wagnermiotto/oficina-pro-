-- CreateEnum
CREATE TYPE "StatusContagem" AS ENUM ('ABERTA', 'CONCLUIDA', 'CANCELADA');

-- AlterTable
ALTER TABLE "oficina_config" ADD COLUMN     "proximoNumeroContagem" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "contagem_estoque" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "StatusContagem" NOT NULL DEFAULT 'ABERTA',
    "categoriaId" UUID,
    "usuarioId" TEXT,
    "observacoes" TEXT,
    "concluidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contagem_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contagem_item" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "contagemId" UUID NOT NULL,
    "pecaId" UUID NOT NULL,
    "saldoSistema" DECIMAL(12,3) NOT NULL,
    "saldoContado" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contagem_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contagem_estoque_oficinaId_numero_idx" ON "contagem_estoque"("oficinaId", "numero");

-- CreateIndex
CREATE INDEX "contagem_item_oficinaId_contagemId_idx" ON "contagem_item"("oficinaId", "contagemId");

-- AddForeignKey
ALTER TABLE "contagem_estoque" ADD CONSTRAINT "contagem_estoque_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagem_estoque" ADD CONSTRAINT "contagem_estoque_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria_peca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagem_item" ADD CONSTRAINT "contagem_item_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagem_item" ADD CONSTRAINT "contagem_item_contagemId_fkey" FOREIGN KEY ("contagemId") REFERENCES "contagem_estoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contagem_item" ADD CONSTRAINT "contagem_item_pecaId_fkey" FOREIGN KEY ("pecaId") REFERENCES "peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
