-- Preferências de notificação por usuário (email / push / in-app por tipo de evento)
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "preferenciasNotificacao" JSONB;
