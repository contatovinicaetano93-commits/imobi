-- AlterTable: add telegramChatId to Usuario for Telegram bot integration
ALTER TABLE "Usuario" ADD COLUMN "telegramChatId" TEXT;

CREATE UNIQUE INDEX "Usuario_telegramChatId_key" ON "Usuario"("telegramChatId");
