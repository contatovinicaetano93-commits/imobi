-- SIPOC: homologação admin, liberação manual, conta bancária empresa

ALTER TYPE "ObraStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_HOMOLOGACAO';
ALTER TYPE "LiberacaoStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_PAGAMENTO';

ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "contaBanco" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "contaAgencia" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "contaNumero" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "contaPix" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "contaTitular" TEXT;

ALTER TABLE "LiberacaoParcela" ADD COLUMN IF NOT EXISTS "etapaId" TEXT;
ALTER TABLE "LiberacaoParcela" ADD COLUMN IF NOT EXISTS "referenciaPagamento" TEXT;

CREATE INDEX IF NOT EXISTS "LiberacaoParcela_etapaId_idx" ON "LiberacaoParcela"("etapaId");
