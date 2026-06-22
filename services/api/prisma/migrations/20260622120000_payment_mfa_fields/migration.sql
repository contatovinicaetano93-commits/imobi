-- Payment tracking on disbursements + MFA for privileged roles
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LiberacaoParcela" ADD COLUMN IF NOT EXISTS "externalPaymentId" TEXT;
ALTER TABLE "LiberacaoParcela" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "LiberacaoParcela" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
