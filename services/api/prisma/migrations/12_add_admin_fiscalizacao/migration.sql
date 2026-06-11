-- Fiscalização do admin: bloqueio de conta e de funções de painel por usuário
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "bloqueadoEm" TIMESTAMP(3);
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "funcoesBloqueadas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
