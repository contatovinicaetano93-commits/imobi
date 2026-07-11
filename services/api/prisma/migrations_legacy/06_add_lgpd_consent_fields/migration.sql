-- Migration: add LGPD consent fields to Usuario
ALTER TABLE "Usuario"
  ADD COLUMN IF NOT EXISTS "consentidoTermos"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consentidoPrivacy"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consentidoKyc"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consentidoMarketing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consentidoEm"        TIMESTAMP(3);
