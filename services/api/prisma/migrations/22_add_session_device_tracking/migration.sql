-- Add IP address and user agent tracking to session tokens for security audit trail
ALTER TABLE "SessaoToken" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE "SessaoToken" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
