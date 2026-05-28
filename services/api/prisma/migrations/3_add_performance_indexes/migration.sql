-- Performance Indexes - Phase 1 Optimization
-- These indexes accelerate critical queries in the imbobi platform

-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Spatial index on Obra geo location (latitude, longitude)
-- Used in: GPS bounds validation and geographic proximity queries
-- Using BRIN for efficient range queries on coordinates
CREATE INDEX "idx_obra_geoLocation_brin" ON "Obra" USING BRIN ("geoLatitude" float8_minmax_ops, "geoLongitude" float8_minmax_ops);

-- Alternative GiST spatial index for bounding box queries (can use in place of BRIN)
-- CREATE INDEX "idx_obra_geoLocation_gist" ON "Obra" USING GIST (box(point("geoLongitude", "geoLatitude"), point("geoLongitude", "geoLatitude")));

-- Usuario email index for efficient login lookups
-- Already indexed as UNIQUE but adding explicit btree index for join performance
-- Ensure uniqueness constraint is maintained for email
CREATE INDEX IF NOT EXISTS "idx_usuario_email_btree" ON "Usuario"("email") WHERE "email" IS NOT NULL;

-- Etapa status index for efficient status filtering
-- Already exists in schema but ensuring composite index for common queries
CREATE INDEX IF NOT EXISTS "idx_etapa_status_composite" ON "EtapaObra"("status", "criadoEm");

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
