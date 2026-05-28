-- CreateTable Webhook
CREATE TABLE "Webhook" (
    "webhookId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "eventos" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("webhookId")
);

-- CreateTable WebhookLog
CREATE TABLE "WebhookLog" (
    "logId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" INTEGER,
    "resposta" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 1,
    "proxImagem" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("logId")
);

-- CreateIndex
CREATE INDEX "Webhook_ativo_idx" ON "Webhook"("ativo");

-- CreateIndex
CREATE INDEX "Webhook_criadoEm_idx" ON "Webhook"("criadoEm");

-- CreateIndex
CREATE INDEX "WebhookLog_webhookId_idx" ON "WebhookLog"("webhookId");

-- CreateIndex
CREATE INDEX "WebhookLog_evento_idx" ON "WebhookLog"("evento");

-- CreateIndex
CREATE INDEX "WebhookLog_timestamp_idx" ON "WebhookLog"("timestamp");

-- CreateIndex
CREATE INDEX "WebhookLog_webhookId_timestamp_idx" ON "WebhookLog"("webhookId", "timestamp");

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("webhookId") ON DELETE CASCADE ON UPDATE CASCADE;
