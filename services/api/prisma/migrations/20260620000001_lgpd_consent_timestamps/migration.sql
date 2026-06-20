-- Migration: add per-consent LGPD timestamps
-- Run: pnpm db:migrate (requires DATABASE_URL)

ALTER TABLE "Usuario"
  ADD COLUMN IF NOT EXISTS "consentidoTermosEm"    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "consentidoPrivacyEm"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "consentidoKycEm"       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "consentidoMarketingEm" TIMESTAMPTZ;
