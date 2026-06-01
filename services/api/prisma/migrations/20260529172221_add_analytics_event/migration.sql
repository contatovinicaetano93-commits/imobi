-- CreateTable
CREATE TABLE "usuario_fcm_tokens" (
    "usuarioId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_fcm_tokens_pkey" PRIMARY KEY ("usuarioId","token")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "eventId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE INDEX "usuario_fcm_tokens_ativo_idx" ON "usuario_fcm_tokens"("ativo");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_usuarioId_idx" ON "AnalyticsEvent"("usuarioId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "usuario_fcm_tokens" ADD CONSTRAINT "usuario_fcm_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
