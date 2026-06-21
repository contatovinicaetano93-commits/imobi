-- Generic financial audit log — tracks every financial and admin action
CREATE TABLE "audit_logs" (
  "auditId"    TEXT         NOT NULL PRIMARY KEY,
  "acao"       TEXT         NOT NULL,
  "entidade"   TEXT         NOT NULL,
  "entidadeId" TEXT         NOT NULL,
  "usuarioId"  TEXT,
  "ipAddress"  TEXT,
  "metadata"   JSONB,
  "criadoEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "audit_logs_entidade_entidadeId_idx" ON "audit_logs"("entidade", "entidadeId");
CREATE INDEX "audit_logs_usuarioId_idx"             ON "audit_logs"("usuarioId");
CREATE INDEX "audit_logs_acao_idx"                  ON "audit_logs"("acao");
CREATE INDEX "audit_logs_criadoEm_idx"              ON "audit_logs"("criadoEm");
