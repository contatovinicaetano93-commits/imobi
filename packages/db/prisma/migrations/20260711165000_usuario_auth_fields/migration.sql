-- Campos de auth presentes no schema Prisma mas ausentes na init_canonico
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "resetTokenExpiraEm" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_resetToken_key" ON "usuarios"("resetToken");
