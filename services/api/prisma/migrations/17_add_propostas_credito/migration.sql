-- CreateEnum
CREATE TYPE "TipoCreditoProposta" AS ENUM ('OBRA_NOVA', 'OBRA_EM_ANDAMENTO', 'CREDITO_PONTE');

-- CreateEnum
CREATE TYPE "PropostaCreditoStatus" AS ENUM ('RECEBIDA', 'EM_ANALISE', 'APROVADA', 'REJEITADA');

-- AlterTable
ALTER TABLE "DueDiligence" ADD COLUMN "tipoCredito" "TipoCreditoProposta";

-- CreateTable
CREATE TABLE "propostas_credito" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipoCredito" "TipoCreditoProposta" NOT NULL,
    "nomeEmpreendimento" TEXT NOT NULL,
    "nomeContato" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "empresa" TEXT,
    "narrativa" TEXT,
    "dataBase" TIMESTAMP(3),
    "percentualFisico" DOUBLE PRECISION,
    "arquivos" JSONB NOT NULL DEFAULT '[]',
    "status" "PropostaCreditoStatus" NOT NULL DEFAULT 'RECEBIDA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "propostas_credito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "propostas_credito_usuarioId_idx" ON "propostas_credito"("usuarioId");

-- CreateIndex
CREATE INDEX "propostas_credito_email_idx" ON "propostas_credito"("email");

-- CreateIndex
CREATE INDEX "propostas_credito_status_idx" ON "propostas_credito"("status");

-- CreateIndex
CREATE INDEX "propostas_credito_tipoCredito_idx" ON "propostas_credito"("tipoCredito");

-- AddForeignKey
ALTER TABLE "propostas_credito" ADD CONSTRAINT "propostas_credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE SET NULL ON UPDATE CASCADE;
