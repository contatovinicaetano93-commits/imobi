-- CreateEnum
CREATE TYPE "AcaoAudit" AS ENUM ('ETAPA_APROVADA', 'ETAPA_REJEITADA', 'KYC_APROVADO', 'KYC_REJEITADO', 'CREDITO_APROVADO', 'CREDITO_REJEITADO');

-- CreateTable
CREATE TABLE "audit_logs" (
    "auditId" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "acao" "AcaoAudit" NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "dados" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("auditId")
);

-- CreateIndex
CREATE INDEX "audit_logs_gestorId_idx" ON "audit_logs"("gestorId");

-- CreateIndex
CREATE INDEX "audit_logs_entidade_idx" ON "audit_logs"("entidade");

-- CreateIndex
CREATE INDEX "audit_logs_acao_idx" ON "audit_logs"("acao");

-- CreateIndex
CREATE INDEX "audit_logs_criadoEm_idx" ON "audit_logs"("criadoEm");
