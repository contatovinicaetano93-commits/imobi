-- Advanced Performance Indexes - Phase 2
-- Additional optimization indexes for query patterns and temporal queries

-- AuditLog timestamp index for temporal queries and log retrieval
-- Used in: compliance queries, historical data retrieval by date
CREATE INDEX IF NOT EXISTS "idx_auditlog_timestamp" ON "AuditLog"("criadoEm" DESC);

-- Composite index for AuditLog user tracking
-- Used in: user action history, admin oversight
CREATE INDEX IF NOT EXISTS "idx_auditlog_usuario_timestamp" ON "AuditLog"("usuarioId", "criadoEm" DESC);

-- KYC workflow optimization - status with timestamp
-- Used in: KYC queue processing, document review workflows
CREATE INDEX IF NOT EXISTS "idx_kyc_documento_status_timestamp" ON "KycDocumento"("status", "criadoEm" DESC);

-- Evidence validation query optimization
-- Used in: work progress calculations, evidence aggregation
CREATE INDEX IF NOT EXISTS "idx_evidencia_obra_validada" ON "EvidenciaEtapa"("obraId", "validada");

-- Session management optimization
-- Used in: token revocation checks, active session queries
CREATE INDEX IF NOT EXISTS "idx_sessao_token_expires" ON "SessaoToken"("expiresAt" DESC);

-- Release status tracking with user context
-- Used in: release processing workflows, user financial dashboards
CREATE INDEX IF NOT EXISTS "idx_liberacao_usuario_status" ON "LiberacaoParcela"
USING HASH ((("Credito"."usuarioId")));

-- FCM token active status lookup
-- Used in: push notification delivery targeting
CREATE INDEX IF NOT EXISTS "idx_fcmtoken_usuario_ativo" ON "usuario_fcm_tokens"("usuarioId", "ativo");

-- Work status aggregation optimization
-- Used in: dashboard work summaries, user portfolio queries
CREATE INDEX IF NOT EXISTS "idx_obra_usuario_status_criacao" ON "Obra"("usuarioId", "status", "criadoEm" DESC);

-- Notification unread with temporal sorting
-- Used in: notification list with unread count, timestamp ordering
CREATE INDEX IF NOT EXISTS "idx_notificacao_usuario_lida_timestamp" ON "Notificacao"("usuarioId", "lida", "criadoEm" DESC);

-- Score history with user aggregation
-- Used in: user score trends, historical analysis
CREATE INDEX IF NOT EXISTS "idx_score_historico_usuario_descending" ON "ScoreHistorico"("usuarioId", "criadoEm" DESC);

-- Enable query parallelization settings for better performance
-- These settings improve PostgreSQL query optimization
ALTER TABLE "Usuario" SET (fillfactor = 80);
ALTER TABLE "Obra" SET (fillfactor = 80);
ALTER TABLE "Credito" SET (fillfactor = 80);
ALTER TABLE "EtapaObra" SET (fillfactor = 80);
ALTER TABLE "LiberacaoParcela" SET (fillfactor = 80);
