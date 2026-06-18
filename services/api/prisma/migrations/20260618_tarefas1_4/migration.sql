-- Migration: Tarefas 1-4 (fluxo financeiro, GPS anti-spoofing, 2FA TOTP, scoring)
-- Apply in order; all statements are idempotent via IF NOT EXISTS / DO $$ guards.

-- ── Tarefa 1: Fluxo financeiro ──────────────────────────────────────────────

-- Novos ENUMs
DO $$ BEGIN
  CREATE TYPE "TipoGarantia" AS ENUM ('IMOVEL', 'RECEBIVEIS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoConta" AS ENUM ('CORRENTE', 'POUPANCA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AcaoOperadorStatus" AS ENUM (
    'AGUARDANDO_DADOS_BANCARIOS',
    'AGUARDANDO_TRANSFERENCIA',
    'TRANSFERENCIA_CONFIRMADA',
    'CANCELADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Colunas em Credito
ALTER TABLE "Credito"
  ADD COLUMN IF NOT EXISTS "tipoGarantia"    "TipoGarantia",
  ADD COLUMN IF NOT EXISTS "creditoPonte"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "feeEstruturacao" DOUBLE PRECISION;

-- Alterar default da taxa mensal para 1.4%
ALTER TABLE "Credito" ALTER COLUMN "taxaMensal" SET DEFAULT 0.014;

-- Coluna RI em Obra
ALTER TABLE "Obra"
  ADD COLUMN IF NOT EXISTS "riValidado" BOOLEAN NOT NULL DEFAULT false;

-- Colunas de fee em LiberacaoParcela
ALTER TABLE "LiberacaoParcela"
  ADD COLUMN IF NOT EXISTS "feeTranche"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "valorLiquido" DOUBLE PRECISION;

-- Tabela DadosBancarios
CREATE TABLE IF NOT EXISTS "dados_bancarios" (
  "dadosBancariosId" TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "usuarioId"        TEXT        NOT NULL,
  "banco"            TEXT        NOT NULL,
  "agencia"          TEXT,
  "conta"            TEXT,
  "tipoConta"        "TipoConta" NOT NULL DEFAULT 'CORRENTE',
  "tipoChavePix"     "TipoChavePix",
  "chavePix"         TEXT,
  "nomeTitular"      TEXT        NOT NULL,
  "cpfCnpjTitular"   TEXT        NOT NULL,
  "criadoEm"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dados_bancarios_pkey" PRIMARY KEY ("dadosBancariosId"),
  CONSTRAINT "dados_bancarios_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "dados_bancarios_usuarioId_key" UNIQUE ("usuarioId")
);

CREATE INDEX IF NOT EXISTS "dados_bancarios_usuarioId_idx" ON "dados_bancarios"("usuarioId");

-- Tabela AcaoOperador
CREATE TABLE IF NOT EXISTS "acoes_operador" (
  "acaoId"           TEXT               NOT NULL DEFAULT gen_random_uuid()::text,
  "liberacaoId"      TEXT               NOT NULL,
  "usuarioId"        TEXT               NOT NULL,
  "valorBruto"       DOUBLE PRECISION   NOT NULL,
  "feeTranche"       DOUBLE PRECISION   NOT NULL,
  "valorTransferir"  DOUBLE PRECISION   NOT NULL,
  "numeroParcela"    INTEGER            NOT NULL,
  "dadosBancariosId" TEXT,
  "status"           "AcaoOperadorStatus" NOT NULL DEFAULT 'AGUARDANDO_DADOS_BANCARIOS',
  "operadorId"       TEXT,
  "confirmadoEm"     TIMESTAMP(3),
  "observacao"       TEXT,
  "criadoEm"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "acoes_operador_pkey" PRIMARY KEY ("acaoId"),
  CONSTRAINT "acoes_operador_liberacaoId_fkey"
    FOREIGN KEY ("liberacaoId") REFERENCES "LiberacaoParcela"("liberacaoId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "acoes_operador_dadosBancariosId_fkey"
    FOREIGN KEY ("dadosBancariosId") REFERENCES "dados_bancarios"("dadosBancariosId") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "acoes_operador_liberacaoId_key" UNIQUE ("liberacaoId")
);

CREATE INDEX IF NOT EXISTS "acoes_operador_status_idx"    ON "acoes_operador"("status");
CREATE INDEX IF NOT EXISTS "acoes_operador_criadoEm_idx"  ON "acoes_operador"("criadoEm");
CREATE INDEX IF NOT EXISTS "acoes_operador_usuarioId_idx" ON "acoes_operador"("usuarioId");

-- Novos valores em TipoNotificacao (add if not present)
DO $$ BEGIN
  ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'DADOS_BANCARIOS_SOLICITADOS';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'TRANSFERENCIA_CONFIRMADA';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'RI_PENDENTE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tarefa 2: GPS anti-spoofing ─────────────────────────────────────────────

ALTER TABLE "EvidenciaEtapa"
  ADD COLUMN IF NOT EXISTS "altitude"         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "heading"          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "speed"            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "isMockLocation"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "timestampCaptura" TIMESTAMP(3);

-- ── Tarefa 3: 2FA TOTP ──────────────────────────────────────────────────────

ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "totpSecret"        TEXT,
  ADD COLUMN IF NOT EXISTS "totpPendingSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "totpAtivo"         BOOLEAN NOT NULL DEFAULT false;

-- ── Tarefa 4: Scoring breakdown ─────────────────────────────────────────────

ALTER TABLE "ScoreHistorico"
  ADD COLUMN IF NOT EXISTS "breakdown" JSONB;
