-- CreateEnum
CREATE TYPE "UsuarioTipo" AS ENUM ('TOMADOR', 'GESTOR_OBRA', 'ADMIN', 'PARCEIRO');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDENTE', 'EM_VERIFICACAO', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "CreditoStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'VENCIDO', 'QUITADO');

-- CreateEnum
CREATE TYPE "ObraStatus" AS ENUM ('PLANEJAMENTO', 'EM_EXECUCAO', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EtapaStatus" AS ENUM ('PLANEJADA', 'EM_EXECUCAO', 'AGUARDANDO_VISTORIA', 'REPROVADA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "LiberacaoStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDA', 'FALHA');

-- CreateTable
CREATE TABLE "Usuario" (
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tipo" "UsuarioTipo" NOT NULL DEFAULT 'TOMADOR',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "SessaoToken" (
    "sessionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoToken_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "Credito" (
    "creditoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "valorAprovado" DOUBLE PRECISION NOT NULL,
    "valorLiberado" DOUBLE PRECISION NOT NULL,
    "taxaMensal" DOUBLE PRECISION NOT NULL DEFAULT 0.0099,
    "prazoMeses" INTEGER NOT NULL,
    "status" "CreditoStatus" NOT NULL DEFAULT 'ATIVO',
    "dataAprovacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataVencimento" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credito_pkey" PRIMARY KEY ("creditoId")
);

-- CreateTable
CREATE TABLE "Obra" (
    "obraId" TEXT NOT NULL,
    "creditoId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "geoLatitude" DOUBLE PRECISION NOT NULL,
    "geoLongitude" DOUBLE PRECISION NOT NULL,
    "raioValidacaoMetros" INTEGER NOT NULL DEFAULT 50,
    "areaM2" DOUBLE PRECISION,
    "tipo" TEXT,
    "status" "ObraStatus" NOT NULL DEFAULT 'PLANEJAMENTO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("obraId")
);

-- CreateTable
CREATE TABLE "EtapaObra" (
    "etapaId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "percentualObra" DOUBLE PRECISION NOT NULL,
    "valorLiberacao" DOUBLE PRECISION NOT NULL,
    "status" "EtapaStatus" NOT NULL DEFAULT 'PLANEJADA',
    "dataConclusaoPrevista" TIMESTAMP(3),
    "dataConclusaoReal" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtapaObra_pkey" PRIMARY KEY ("etapaId")
);

-- CreateTable
CREATE TABLE "EvidenciaEtapa" (
    "evidenciaId" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "latCaptura" DOUBLE PRECISION NOT NULL,
    "lngCaptura" DOUBLE PRECISION NOT NULL,
    "accuracyMetros" DOUBLE PRECISION,
    "distanciaObra" DOUBLE PRECISION,
    "validada" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenciaEtapa_pkey" PRIMARY KEY ("evidenciaId")
);

-- CreateTable
CREATE TABLE "LiberacaoParcela" (
    "liberacaoId" TEXT NOT NULL,
    "creditoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" "LiberacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "motivo" TEXT,
    "processadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiberacaoParcela_pkey" PRIMARY KEY ("liberacaoId")
);

-- CreateTable
CREATE TABLE "ScoreHistorico" (
    "scoreId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "motivo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreHistorico_pkey" PRIMARY KEY ("scoreId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_cpf_idx" ON "Usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoToken_refreshToken_key" ON "SessaoToken"("refreshToken");

-- CreateIndex
CREATE INDEX "SessaoToken_usuarioId_idx" ON "SessaoToken"("usuarioId");

-- CreateIndex
CREATE INDEX "Credito_usuarioId_idx" ON "Credito"("usuarioId");

-- CreateIndex
CREATE INDEX "Credito_status_idx" ON "Credito"("status");

-- CreateIndex
CREATE INDEX "Obra_usuarioId_idx" ON "Obra"("usuarioId");

-- CreateIndex
CREATE INDEX "Obra_creditoId_idx" ON "Obra"("creditoId");

-- CreateIndex
CREATE INDEX "Obra_status_idx" ON "Obra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EtapaObra_obraId_ordem_key" ON "EtapaObra"("obraId", "ordem");

-- CreateIndex
CREATE INDEX "EtapaObra_obraId_idx" ON "EtapaObra"("obraId");

-- CreateIndex
CREATE INDEX "EtapaObra_status_idx" ON "EtapaObra"("status");

-- CreateIndex
CREATE INDEX "EvidenciaEtapa_etapaId_idx" ON "EvidenciaEtapa"("etapaId");

-- CreateIndex
CREATE INDEX "EvidenciaEtapa_obraId_idx" ON "EvidenciaEtapa"("obraId");

-- CreateIndex
CREATE INDEX "EvidenciaEtapa_validada_idx" ON "EvidenciaEtapa"("validada");

-- CreateIndex
CREATE INDEX "LiberacaoParcela_creditoId_idx" ON "LiberacaoParcela"("creditoId");

-- CreateIndex
CREATE INDEX "LiberacaoParcela_status_idx" ON "LiberacaoParcela"("status");

-- CreateIndex
CREATE INDEX "ScoreHistorico_usuarioId_idx" ON "ScoreHistorico"("usuarioId");

-- CreateIndex
CREATE INDEX "ScoreHistorico_criadoEm_idx" ON "ScoreHistorico"("criadoEm");

-- AddForeignKey
ALTER TABLE "SessaoToken" ADD CONSTRAINT "SessaoToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credito" ADD CONSTRAINT "Credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito"("creditoId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obra" ADD CONSTRAINT "Obra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaObra" ADD CONSTRAINT "EtapaObra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaEtapa" ADD CONSTRAINT "EvidenciaEtapa_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "EtapaObra"("etapaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaEtapa" ADD CONSTRAINT "EvidenciaEtapa_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoParcela" ADD CONSTRAINT "LiberacaoParcela_creditoId_fkey" FOREIGN KEY ("creditoId") REFERENCES "Credito"("creditoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreHistorico" ADD CONSTRAINT "ScoreHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
