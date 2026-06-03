-- Add FCM token storage for push notifications
CREATE TABLE "usuario_fcm_tokens" (
    "usuarioId"    TEXT NOT NULL,
    "token"        TEXT NOT NULL,
    "ativo"        BOOLEAN NOT NULL DEFAULT true,
    "criadoEm"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_fcm_tokens_pkey" PRIMARY KEY ("usuarioId", "token")
);

CREATE INDEX "usuario_fcm_tokens_ativo_idx" ON "usuario_fcm_tokens"("ativo");

ALTER TABLE "usuario_fcm_tokens"
    ADD CONSTRAINT "usuario_fcm_tokens_usuarioId_fkey"
    FOREIGN KEY ("usuarioId")
    REFERENCES "Usuario"("usuarioId")
    ON DELETE CASCADE ON UPDATE CASCADE;
