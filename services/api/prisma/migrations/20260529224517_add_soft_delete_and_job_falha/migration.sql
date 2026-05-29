-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "deletadoEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Usuario_deletadoEm_idx" ON "Usuario"("deletadoEm");

-- AlterTable
ALTER TABLE "EvidenciaEtapa" ADD COLUMN "exifTimestamp" TIMESTAMP(3);
ALTER TABLE "EvidenciaEtapa" ADD COLUMN "fotoKey" TEXT;

-- CreateTable
CREATE TABLE "JobFalha" (
    "jobFalhaId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "erro" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobFalha_pkey" PRIMARY KEY ("jobFalhaId")
);

-- CreateIndex
CREATE INDEX "JobFalha_queue_idx" ON "JobFalha"("queue");

-- CreateIndex
CREATE INDEX "JobFalha_criadoEm_idx" ON "JobFalha"("criadoEm");
