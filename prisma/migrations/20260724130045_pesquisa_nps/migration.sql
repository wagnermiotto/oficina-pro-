-- CreateTable
CREATE TABLE "pesquisa_nps" (
    "id" UUID NOT NULL,
    "oficinaId" TEXT NOT NULL,
    "ordemServicoId" UUID NOT NULL,
    "clienteId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "nota" INTEGER,
    "comentario" TEXT,
    "respondidoEm" TIMESTAMP(3),
    "ipRespondente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pesquisa_nps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pesquisa_nps_token_key" ON "pesquisa_nps"("token");

-- CreateIndex
CREATE INDEX "pesquisa_nps_oficinaId_ordemServicoId_idx" ON "pesquisa_nps"("oficinaId", "ordemServicoId");

-- CreateIndex
CREATE INDEX "pesquisa_nps_oficinaId_respondidoEm_idx" ON "pesquisa_nps"("oficinaId", "respondidoEm");

-- AddForeignKey
ALTER TABLE "pesquisa_nps" ADD CONSTRAINT "pesquisa_nps_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_nps" ADD CONSTRAINT "pesquisa_nps_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesquisa_nps" ADD CONSTRAINT "pesquisa_nps_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
