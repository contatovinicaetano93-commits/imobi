-- Migration: add Dossiê de Crédito (analysis dossier for construction credit)
-- Models: DossieCredito, DossieUnidade, DossieRecebivel, DossieDistrato,
--         DossieDocumento, DossieAuditLog

-- ── Enums ───────────────────────────────────────────────────────────────

CREATE TYPE "DossieStatus" AS ENUM ('RASCUNHO', 'EM_ANALISE', 'PENDENCIA', 'APROVADO', 'REPROVADO');
CREATE TYPE "DossieUnidadeStatus" AS ENUM ('VENDIDA', 'PERMUTA', 'ESTOQUE', 'QUITADA');
CREATE TYPE "SistemaAmortizacao" AS ENUM ('PRICE', 'SAC', 'SACOC');
CREATE TYPE "DossieDocumentoTipo" AS ENUM (
  'DEMONSTRACAO_FINANCEIRA', 'APRESENTACAO_PROJETO', 'APRESENTACAO_EMPRESA',
  'ORGANOGRAMA_SOCIETARIO', 'ACORDO_PERMUTA', 'CRONOGRAMA_FISICO_FINANCEIRO',
  'OUTRO'
);

-- ── DossieCredito ────────────────────────────────────────────────────────

CREATE TABLE "DossieCredito" (
  "dossieId"             TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "creditoId"            TEXT,
  "usuarioId"            TEXT      NOT NULL,
  "status"               "DossieStatus" NOT NULL DEFAULT 'RASCUNHO',
  "etapasConcluidas"     INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],

  -- Ficha do Empreendimento
  "nomeEmpreendimento"   TEXT      NOT NULL,
  "speRazaoSocial"       TEXT,
  "speCnpj"              TEXT,
  "endereco"             TEXT,
  "cidade"               TEXT,
  "uf"                   TEXT,
  "tipoEmpreendimento"   TEXT,
  "patrimonioAfetacao"   BOOLEAN   NOT NULL DEFAULT false,
  "areaTerrenoM2"        DOUBLE PRECISION,
  "areaConstruidaM2"     DOUBLE PRECISION,
  "areaPrivativaTotalM2" DOUBLE PRECISION,
  "valorTerreno"         DOUBLE PRECISION,
  "dataLancamento"       TIMESTAMP(3),
  "dataInicioObras"      TIMESTAMP(3),
  "dataPrevisaoTermino"  TIMESTAMP(3),
  "dataHabiteSe"         TIMESTAMP(3),
  "alienacaoFiduciariaTerreno"  BOOLEAN NOT NULL DEFAULT false,
  "alienacaoFiduciariaUnidades" BOOLEAN NOT NULL DEFAULT false,
  "seguroObra"           BOOLEAN   NOT NULL DEFAULT false,
  "percentualEntrada"    DOUBLE PRECISION,
  "percentualObras"      DOUBLE PRECISION,
  "percentualChaves"     DOUBLE PRECISION,
  "orcamentoOriginal"    DOUBLE PRECISION,
  "orcamentoAtual"       DOUBLE PRECISION,
  "custoIncorrido"       DOUBLE PRECISION,
  "custoAIncorrer"       DOUBLE PRECISION,
  "percentualCronogramaFisico"     DOUBLE PRECISION,
  "percentualCronogramaFinanceiro" DOUBLE PRECISION,

  -- Permutas
  "possuiAcordoNaoConcorrenciaPermuta" BOOLEAN,

  -- Empresa desenvolvedora/controladora
  "empresaNome"          TEXT,
  "empresaCnpj"          TEXT,
  "empresaWebsite"       TEXT,
  "empresaAnoFundacao"   INTEGER,

  "submetidoEm"          TIMESTAMP(3),
  "analisadoPor"         TEXT,
  "analisadoEm"          TIMESTAMP(3),
  "criadoEm"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DossieCredito_pkey" PRIMARY KEY ("dossieId")
);

CREATE INDEX "DossieCredito_usuarioId_idx" ON "DossieCredito"("usuarioId");
CREATE INDEX "DossieCredito_creditoId_idx" ON "DossieCredito"("creditoId");
CREATE INDEX "DossieCredito_status_idx"    ON "DossieCredito"("status");
CREATE INDEX "DossieCredito_criadoEm_idx"  ON "DossieCredito"("criadoEm");

ALTER TABLE "DossieCredito"
  ADD CONSTRAINT "DossieCredito_creditoId_fkey"
  FOREIGN KEY ("creditoId") REFERENCES "Credito"("creditoId")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DossieCredito"
  ADD CONSTRAINT "DossieCredito_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── DossieUnidade ────────────────────────────────────────────────────────

CREATE TABLE "DossieUnidade" (
  "unidadeId"          TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "dossieId"           TEXT      NOT NULL,
  "numeroContrato"     TEXT,
  "numeroUnidade"      TEXT      NOT NULL,
  "areaPrivativaM2"    DOUBLE PRECISION NOT NULL,
  "clienteNome"        TEXT,
  "clienteCpfCnpj"     TEXT,
  "dataVenda"          TIMESTAMP(3),
  "valorVenda"         DOUBLE PRECISION,
  "valorTabela"        DOUBLE PRECISION,
  "status"             "DossieUnidadeStatus" NOT NULL DEFAULT 'ESTOQUE',
  "indexador"          TEXT,
  "taxaJurosMensal"    DOUBLE PRECISION,
  "sistemaAmortizacao" "SistemaAmortizacao",
  "criadoEm"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DossieUnidade_pkey" PRIMARY KEY ("unidadeId")
);

CREATE UNIQUE INDEX "DossieUnidade_dossieId_numeroUnidade_key" ON "DossieUnidade"("dossieId", "numeroUnidade");
CREATE INDEX "DossieUnidade_dossieId_idx" ON "DossieUnidade"("dossieId");
CREATE INDEX "DossieUnidade_status_idx"   ON "DossieUnidade"("status");

ALTER TABLE "DossieUnidade"
  ADD CONSTRAINT "DossieUnidade_dossieId_fkey"
  FOREIGN KEY ("dossieId") REFERENCES "DossieCredito"("dossieId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── DossieRecebivel ──────────────────────────────────────────────────────

CREATE TABLE "DossieRecebivel" (
  "recebivelId"    TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "dossieId"       TEXT      NOT NULL,
  "unidadeId"      TEXT,
  "numeroContrato" TEXT,
  "numeroUnidade"  TEXT      NOT NULL,
  "clienteNome"    TEXT,
  "parcelaAtual"   INTEGER   NOT NULL,
  "totalParcelas"  INTEGER   NOT NULL,
  "dataVencimento" TIMESTAMP(3) NOT NULL,
  "dataPagamento"  TIMESTAMP(3),
  "valorParcela"   DOUBLE PRECISION NOT NULL,
  "valorRecebido"  DOUBLE PRECISION,
  "criadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DossieRecebivel_pkey" PRIMARY KEY ("recebivelId")
);

CREATE INDEX "DossieRecebivel_dossieId_idx"       ON "DossieRecebivel"("dossieId");
CREATE INDEX "DossieRecebivel_unidadeId_idx"      ON "DossieRecebivel"("unidadeId");
CREATE INDEX "DossieRecebivel_dataVencimento_idx" ON "DossieRecebivel"("dataVencimento");
CREATE INDEX "DossieRecebivel_dataPagamento_idx"  ON "DossieRecebivel"("dataPagamento");

ALTER TABLE "DossieRecebivel"
  ADD CONSTRAINT "DossieRecebivel_dossieId_fkey"
  FOREIGN KEY ("dossieId") REFERENCES "DossieCredito"("dossieId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DossieRecebivel"
  ADD CONSTRAINT "DossieRecebivel_unidadeId_fkey"
  FOREIGN KEY ("unidadeId") REFERENCES "DossieUnidade"("unidadeId")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── DossieDistrato ───────────────────────────────────────────────────────

CREATE TABLE "DossieDistrato" (
  "distratoId"      TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "dossieId"        TEXT      NOT NULL,
  "unidadeId"       TEXT,
  "numeroContrato"  TEXT,
  "numeroUnidade"   TEXT      NOT NULL,
  "clienteNome"     TEXT,
  "dataVenda"       TIMESTAMP(3),
  "dataDistrato"    TIMESTAMP(3) NOT NULL,
  "valorRecebido"   DOUBLE PRECISION,
  "valorRestituido" DOUBLE PRECISION,
  "motivo"          TEXT,
  "criadoEm"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DossieDistrato_pkey" PRIMARY KEY ("distratoId")
);

CREATE INDEX "DossieDistrato_dossieId_idx"     ON "DossieDistrato"("dossieId");
CREATE INDEX "DossieDistrato_unidadeId_idx"    ON "DossieDistrato"("unidadeId");
CREATE INDEX "DossieDistrato_dataDistrato_idx" ON "DossieDistrato"("dataDistrato");

ALTER TABLE "DossieDistrato"
  ADD CONSTRAINT "DossieDistrato_dossieId_fkey"
  FOREIGN KEY ("dossieId") REFERENCES "DossieCredito"("dossieId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DossieDistrato"
  ADD CONSTRAINT "DossieDistrato_unidadeId_fkey"
  FOREIGN KEY ("unidadeId") REFERENCES "DossieUnidade"("unidadeId")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ── DossieDocumento ──────────────────────────────────────────────────────

CREATE TABLE "DossieDocumento" (
  "dossieDocumentoId" TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "dossieId"          TEXT      NOT NULL,
  "tipo"              "DossieDocumentoTipo" NOT NULL,
  "url"               TEXT      NOT NULL,
  "nomeArquivo"       TEXT,
  "anoExercicio"      INTEGER,
  "descricao"         TEXT,
  "criadoEm"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DossieDocumento_pkey" PRIMARY KEY ("dossieDocumentoId")
);

CREATE INDEX "DossieDocumento_dossieId_idx" ON "DossieDocumento"("dossieId");
CREATE INDEX "DossieDocumento_tipo_idx"     ON "DossieDocumento"("tipo");

ALTER TABLE "DossieDocumento"
  ADD CONSTRAINT "DossieDocumento_dossieId_fkey"
  FOREIGN KEY ("dossieId") REFERENCES "DossieCredito"("dossieId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── DossieAuditLog ───────────────────────────────────────────────────────

CREATE TABLE "DossieAuditLog" (
  "auditId"        TEXT      NOT NULL DEFAULT gen_random_uuid()::text,
  "dossieId"       TEXT      NOT NULL,
  "acaoTipo"       TEXT      NOT NULL,
  "statusAnterior" "DossieStatus",
  "statusNovo"     "DossieStatus",
  "usuarioId"      TEXT      NOT NULL,
  "observacoes"    TEXT,
  "criadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DossieAuditLog_pkey" PRIMARY KEY ("auditId")
);

CREATE INDEX "DossieAuditLog_dossieId_idx"  ON "DossieAuditLog"("dossieId");
CREATE INDEX "DossieAuditLog_usuarioId_idx" ON "DossieAuditLog"("usuarioId");
CREATE INDEX "DossieAuditLog_criadoEm_idx"  ON "DossieAuditLog"("criadoEm");

ALTER TABLE "DossieAuditLog"
  ADD CONSTRAINT "DossieAuditLog_dossieId_fkey"
  FOREIGN KEY ("dossieId") REFERENCES "DossieCredito"("dossieId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DossieAuditLog"
  ADD CONSTRAINT "DossieAuditLog_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
