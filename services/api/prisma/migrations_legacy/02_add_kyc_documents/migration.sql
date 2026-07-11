-- CreateEnum
CREATE TYPE "KycDocumentoStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "KycDocumento" (
    "kycDocumentoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "KycDocumentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "motivo_rejeicao" TEXT,
    "analisadoPor" TEXT,
    "analisadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycDocumento_pkey" PRIMARY KEY ("kycDocumentoId")
);

-- CreateIndex
CREATE INDEX "KycDocumento_usuarioId_idx" ON "KycDocumento"("usuarioId");

-- CreateIndex
CREATE INDEX "KycDocumento_status_idx" ON "KycDocumento"("status");

-- CreateIndex
CREATE INDEX "KycDocumento_criadoEm_idx" ON "KycDocumento"("criadoEm");

-- AddForeignKey
ALTER TABLE "KycDocumento" ADD CONSTRAINT "KycDocumento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
