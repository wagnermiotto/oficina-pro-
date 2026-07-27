-- AlterTable
ALTER TABLE "oficina_config" ADD COLUMN     "responsavelCpf" TEXT,
ADD COLUMN     "responsavelNome" TEXT;

-- CreateTable
CREATE TABLE "recurso_oficina" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurso_oficina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurso_oficina_oficinaId_chave_key" ON "recurso_oficina"("oficinaId", "chave");

-- AddForeignKey
ALTER TABLE "recurso_oficina" ADD CONSTRAINT "recurso_oficina_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
