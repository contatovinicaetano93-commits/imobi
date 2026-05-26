-- Add index for KYC documents by analyzer
CREATE INDEX IF NOT EXISTS "kyc_documento_analisadoPor_idx" ON "KycDocumento"("analisadoPor");

-- Add composite index for etapa queries (commonly searched together)
CREATE INDEX IF NOT EXISTS "etapa_obra_status_criadoEm_idx" ON "EtapaObra"("status", "criadoEm");

-- Add index for credito user queries
CREATE INDEX IF NOT EXISTS "credito_usuarioId_status_idx" ON "Credito"("usuarioId", "status");

-- Add index for obra user queries
CREATE INDEX IF NOT EXISTS "obra_usuarioId_status_idx" ON "Obra"("usuarioId", "status");

-- Add index for evidence etapa queries
CREATE INDEX IF NOT EXISTS "evidencia_etapaId_validada_idx" ON "EvidenciaEtapa"("etapaId", "validada");
