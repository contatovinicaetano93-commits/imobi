-- Migration: Convert all monetary Float fields to DECIMAL(14,2) for fintech-grade precision.
-- Float (IEEE 754 double) cannot represent decimal fractions exactly, causing rounding errors
-- in financial arithmetic. DECIMAL(14,2) stores exact values.

ALTER TABLE "Credito"
  ALTER COLUMN "valorAprovado" TYPE DECIMAL(14,2) USING "valorAprovado"::DECIMAL(14,2),
  ALTER COLUMN "valorLiberado" TYPE DECIMAL(14,2) USING "valorLiberado"::DECIMAL(14,2);

ALTER TABLE "EtapaObra"
  ALTER COLUMN "valorLiberacao" TYPE DECIMAL(14,2) USING "valorLiberacao"::DECIMAL(14,2);

ALTER TABLE "LiberacaoParcela"
  ALTER COLUMN "valor" TYPE DECIMAL(14,2) USING "valor"::DECIMAL(14,2);

ALTER TABLE "solicitacoes_credito"
  ALTER COLUMN "valorSolicitado" TYPE DECIMAL(14,2) USING "valorSolicitado"::DECIMAL(14,2),
  ALTER COLUMN "vgv"             TYPE DECIMAL(14,2) USING "vgv"::DECIMAL(14,2),
  ALTER COLUMN "custoObra"       TYPE DECIMAL(14,2) USING "custoObra"::DECIMAL(14,2);

ALTER TABLE "DueDiligence"
  ALTER COLUMN "totalCarteira"  TYPE DECIMAL(14,2) USING "totalCarteira"::DECIMAL(14,2),
  ALTER COLUMN "totalAReceber"  TYPE DECIMAL(14,2) USING "totalAReceber"::DECIMAL(14,2);
