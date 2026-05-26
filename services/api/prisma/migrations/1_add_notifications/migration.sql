-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('ETAPA_APROVADA', 'ETAPA_REPROVADA', 'PARCELA_LIBERADA', 'PARCELA_FALHA', 'CREDITO_APROVADO', 'KYC_APROVADO', 'KYC_REJEITADO', 'OBRA_CRIADA', 'SCORE_ATUALIZADO', 'VISTORIA_PENDENTE');

-- CreateTable
CREATE TABLE "Notificacao" (
    "notificacaoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("notificacaoId")
);

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_idx" ON "Notificacao"("usuarioId");

-- CreateIndex
CREATE INDEX "Notificacao_lida_idx" ON "Notificacao"("lida");

-- CreateIndex
CREATE INDEX "Notificacao_criadoEm_idx" ON "Notificacao"("criadoEm");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
