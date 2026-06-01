-- Add soft-delete support for LGPD Article 17 (Right to Deletion)
-- deletadoEm timestamp marks when user initiated account deletion
-- Hard delete occurs 30 days later via BullMQ job

ALTER TABLE "Usuario" ADD COLUMN "deletadoEm" TIMESTAMP(3);

-- Index for finding users marked for deletion
CREATE INDEX "Usuario_deletadoEm_idx" ON "Usuario"("deletadoEm");
