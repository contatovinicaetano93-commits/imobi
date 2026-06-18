-- Add audit trail for sensitive admin actions (user creation, role changes, block, delete)
CREATE TABLE "AdminAuditLog" (
    "auditId" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "alvoId" TEXT,
    "acaoTipo" TEXT NOT NULL,
    "detalhes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Usuario" ("usuarioId") ON DELETE RESTRICT,
    CONSTRAINT "AdminAuditLog_alvoId_fkey" FOREIGN KEY ("alvoId") REFERENCES "Usuario" ("usuarioId") ON DELETE SET NULL
);

CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_alvoId_idx" ON "AdminAuditLog"("alvoId");
CREATE INDEX "AdminAuditLog_acaoTipo_idx" ON "AdminAuditLog"("acaoTipo");
CREATE INDEX "AdminAuditLog_criadoEm_idx" ON "AdminAuditLog"("criadoEm");
