-- Track whether an approved credit request has had a Credito record issued.
-- Needed for KYC-gate: if KYC was pending when committee approved, the credit is
-- issued later (when KYC completes) using this flag to prevent duplicates.
ALTER TABLE "solicitacoes_credito"
  ADD COLUMN IF NOT EXISTS "creditoEmitido" BOOLEAN NOT NULL DEFAULT FALSE;
