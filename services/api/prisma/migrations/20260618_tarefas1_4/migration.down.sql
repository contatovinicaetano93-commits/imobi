-- DOWN MIGRATION: Rollback Tarefas 1-4
-- Run ONLY after deploying the forward migration has been confirmed broken.
-- Order: reverse of apply order (constraints/tables first, then columns, then enums).

-- ── Rollback Tarefa 4 ────────────────────────────────────────────────────────
ALTER TABLE "ScoreHistorico" DROP COLUMN IF EXISTS "breakdown";

-- ── Rollback Tarefa 3 ────────────────────────────────────────────────────────
ALTER TABLE "usuarios"
  DROP COLUMN IF EXISTS "totpAtivo",
  DROP COLUMN IF EXISTS "totpPendingSecret",
  DROP COLUMN IF EXISTS "totpSecret";

-- ── Rollback Tarefa 2 ────────────────────────────────────────────────────────
ALTER TABLE "EvidenciaEtapa"
  DROP COLUMN IF EXISTS "timestampCaptura",
  DROP COLUMN IF EXISTS "isMockLocation",
  DROP COLUMN IF EXISTS "speed",
  DROP COLUMN IF EXISTS "heading",
  DROP COLUMN IF EXISTS "altitude";

-- ── Rollback Tarefa 1 ────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "acoes_operador";
DROP TABLE IF EXISTS "dados_bancarios";

ALTER TABLE "LiberacaoParcela"
  DROP COLUMN IF EXISTS "valorLiquido",
  DROP COLUMN IF EXISTS "feeTranche";

ALTER TABLE "Obra"
  DROP COLUMN IF EXISTS "riValidado";

ALTER TABLE "Credito"
  DROP COLUMN IF EXISTS "feeEstruturacao",
  DROP COLUMN IF EXISTS "creditoPonte",
  DROP COLUMN IF EXISTS "tipoGarantia";

-- Revert taxaMensal default (was 0 in original)
ALTER TABLE "Credito" ALTER COLUMN "taxaMensal" SET DEFAULT 0;

DROP TYPE IF EXISTS "AcaoOperadorStatus";
DROP TYPE IF EXISTS "TipoChavePix";
DROP TYPE IF EXISTS "TipoConta";
DROP TYPE IF EXISTS "TipoGarantia";

-- Note: PostgreSQL cannot remove individual values from ENUMs.
-- DADOS_BANCARIOS_SOLICITADOS, TRANSFERENCIA_CONFIRMADA, RI_PENDENTE
-- remain in TipoNotificacao but are unused after rollback.
