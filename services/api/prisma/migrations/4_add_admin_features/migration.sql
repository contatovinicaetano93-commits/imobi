-- Add admin features to Usuario table
ALTER TABLE "Usuario" ADD COLUMN "bloqueado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "motivoBloqueio" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "bloqueadoEm" TIMESTAMP(3);

-- Create index for blocked users
CREATE INDEX "Usuario_bloqueado_idx" ON "Usuario"("bloqueado");

-- Create AuditLog table for tracking admin actions
CREATE TABLE "AuditLog" (
    "logId" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT,
    "mudancasAntes" JSONB,
    "mudancasDepois" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("usuarioId") ON DELETE CASCADE,
    CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Usuario" ("usuarioId") ON DELETE CASCADE
);

-- Create indexes for AuditLog
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");
CREATE INDEX "AuditLog_acao_idx" ON "AuditLog"("acao");
CREATE INDEX "AuditLog_criadoEm_idx" ON "AuditLog"("criadoEm");
