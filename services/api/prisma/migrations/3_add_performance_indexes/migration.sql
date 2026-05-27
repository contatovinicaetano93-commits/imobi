-- Performance Indexes - Phase 1 Optimization
-- These indexes accelerate critical queries in the imbobi platform

-- Credito queries by usuarioId + status
-- Used in: buscarPorUsuario() with status filtering
CREATE INDEX "idx_credito_usuario_status" ON "Credito"("usuarioId", "status");

-- LiberacaoParcela workflow queries
-- Used in: release tracking and status monitoring
CREATE INDEX "idx_liberacao_credito_status" ON "LiberacaoParcela"("creditoId", "status");

-- Notificacao unread counts
-- Used in: dashboard KPIs and notification queries
CREATE INDEX "idx_notificacao_usuario_nao_lida" ON "Notificacao"("usuarioId", "lida");

-- Score history ordering
-- Used in: score history retrieval with DESC ordering
CREATE INDEX "idx_score_usuario_ordem" ON "ScoreHistorico"("usuarioId", "criadoEm" DESC);

-- Etapa queries by obra + status
-- Used in: progressoGeral() and etapa listing with filtering
CREATE INDEX "idx_etapa_obra_status" ON "EtapaObra"("obraId", "status");
