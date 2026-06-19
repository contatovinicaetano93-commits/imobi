-- Compound index for active sessions lookup (hot path in gerarTokens)
CREATE INDEX IF NOT EXISTS "SessaoToken_usuarioId_revogadoEm_expiresAt_idx"
  ON "SessaoToken" ("usuarioId", "revogadoEm", "expiresAt");

-- Compound index for notification list (hot path: userId + unread + ordered)
CREATE INDEX IF NOT EXISTS "Notificacao_usuarioId_lida_criadoEm_idx"
  ON "Notificacao" ("usuarioId", "lida", "criadoEm" DESC);
