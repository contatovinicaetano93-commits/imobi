-- Missing performance indexes and schema additions

-- EvidenciaEtapa: soft-delete support
ALTER TABLE "EvidenciaEtapa" ADD COLUMN IF NOT EXISTS "deletadoEm" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "idx_evidenciaetapa_deletadoem" ON "EvidenciaEtapa"("deletadoEm");

-- Missing performance indexes for high-traffic queries

-- Credito: compound index for dashboard filtering by user + date sort
CREATE INDEX IF NOT EXISTS "idx_credito_usuarioid_criadoem" ON "Credito"("usuarioId", "criadoEm" DESC);

-- EtapaObra: compound index for status queries scoped to an obra
CREATE INDEX IF NOT EXISTS "idx_etapaobra_obraid_status" ON "EtapaObra"("obraId", status);

-- Notificacao: compound index for unread notification queries per user
CREATE INDEX IF NOT EXISTS "idx_notificacao_usuarioid_lida" ON "Notificacao"("usuarioId", lida);

-- Documento: index for listing docs by owner
CREATE INDEX IF NOT EXISTS "idx_documentos_usuarioid" ON "documentos"("usuarioId");

-- Documento: compound index for listing docs by obra + date sort
CREATE INDEX IF NOT EXISTS "idx_documentos_obraid_criadoem" ON "documentos"("obraId", "criadoEm" DESC);
