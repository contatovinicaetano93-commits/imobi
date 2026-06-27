-- Add audit trail for etapa approvals/rejections
CREATE TABLE "EtapaAuditLog" (
    "auditId" TEXT NOT NULL PRIMARY KEY,
    "etapaId" TEXT NOT NULL,
    "acaoTipo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EtapaAuditLog_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "EtapaObra" ("etapaId") ON DELETE CASCADE,
    CONSTRAINT "EtapaAuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("usuarioId") ON DELETE RESTRICT
);

-- Add audit trail for KYC approvals/rejections
CREATE TABLE "KycAuditLog" (
    "auditId" TEXT NOT NULL PRIMARY KEY,
    "kycDocumentoId" TEXT NOT NULL,
    "acaoTipo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KycAuditLog_kycDocumentoId_fkey" FOREIGN KEY ("kycDocumentoId") REFERENCES "KycDocumento" ("kycDocumentoId") ON DELETE CASCADE,
    CONSTRAINT "KycAuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("usuarioId") ON DELETE RESTRICT
);

-- Indexes for audit logs
CREATE INDEX "EtapaAuditLog_etapaId_idx" ON "EtapaAuditLog"("etapaId");
CREATE INDEX "EtapaAuditLog_usuarioId_idx" ON "EtapaAuditLog"("usuarioId");
CREATE INDEX "EtapaAuditLog_criadoEm_idx" ON "EtapaAuditLog"("criadoEm");

CREATE INDEX "KycAuditLog_kycDocumentoId_idx" ON "KycAuditLog"("kycDocumentoId");
CREATE INDEX "KycAuditLog_usuarioId_idx" ON "KycAuditLog"("usuarioId");
CREATE INDEX "KycAuditLog_criadoEm_idx" ON "KycAuditLog"("criadoEm");
