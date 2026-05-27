-- Add performance indexes for geographic queries and KYC status filtering
-- Phase 1 of performance optimization: Database Indexing

-- Composite index for geographic bounds queries (GPS validation)
-- This is critical for the evidencia.validarGPS() function
CREATE INDEX idx_obra_geo_location ON "Obra"("geoLatitude", "geoLongitude");

-- Index for KYC status filtering in score calculations
-- This accelerates queries like: WHERE kycStatus = 'APROVADO'
CREATE INDEX idx_usuario_kyc_status ON "Usuario"("kycStatus");

-- Index for commonly filtered evidence queries
-- Speeds up: WHERE validada = true/false
CREATE INDEX idx_evidencia_validada_status ON "EvidenciaEtapa"("validada", "criadoEm");

-- Index for etapa status + createdAt filtering (approval workflows)
-- Used in: WHERE status = 'AGUARDANDO_VISTORIA' ORDER BY criadoEm
CREATE INDEX idx_etapa_status_tempo ON "EtapaObra"("status", "criadoEm");

-- Index for obra status filtering (dashboard queries)
-- Used in: WHERE status = 'EM_EXECUCAO' OR status = 'CONCLUIDA'
CREATE INDEX idx_obra_status ON "Obra"("status");
