-- CreateEnum
CREATE TYPE "SolicitacaoStatus" AS ENUM ('PENDENTE', 'EM_COMITE', 'APROVADA', 'AJUSTADA', 'REPROVADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ComiteStatus" AS ENUM ('ABERTO', 'EM_VOTACAO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "ComiteDecisao" AS ENUM ('APROVADO', 'AJUSTADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "VotoDecisao" AS ENUM ('APROVAR', 'AJUSTAR', 'REPROVAR');

-- CreateTable
CREATE TABLE "solicitacoes_credito" (
    "solicitacaoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "obraId" TEXT,
    "valorSolicitado" DOUBLE PRECISION NOT NULL,
    "prazoMeses" INTEGER NOT NULL,
    "taxaMensal" DOUBLE PRECISION NOT NULL,
    "finalidade" TEXT NOT NULL,
    "garantias" TEXT,
    "observacoes" TEXT,
    "vgv" DOUBLE PRECISION,
    "ltv" DOUBLE PRECISION,
    "custoObra" DOUBLE PRECISION,
    "ratingCalculado" TEXT,
    "status" "SolicitacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitacoes_credito_pkey" PRIMARY KEY ("solicitacaoId")
);

-- CreateTable
CREATE TABLE "comites_digitais" (
    "comiteId" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "parecerTecnico" TEXT,
    "parecerEngId" TEXT,
    "parecerEm" TIMESTAMP(3),
    "status" "ComiteStatus" NOT NULL DEFAULT 'ABERTO',
    "decisao" "ComiteDecisao",
    "decisaoMotivo" TEXT,
    "decisaoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comites_digitais_pkey" PRIMARY KEY ("comiteId")
);

-- CreateTable
CREATE TABLE "votos_comite" (
    "votoId" TEXT NOT NULL,
    "comiteId" TEXT NOT NULL,
    "votanteId" TEXT NOT NULL,
    "voto" "VotoDecisao" NOT NULL,
    "justificativa" TEXT,
    "condicoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_comite_pkey" PRIMARY KEY ("votoId")
);

-- CreateIndex
CREATE INDEX "solicitacoes_credito_usuarioId_idx" ON "solicitacoes_credito"("usuarioId");
CREATE INDEX "solicitacoes_credito_status_idx" ON "solicitacoes_credito"("status");
CREATE UNIQUE INDEX "comites_digitais_solicitacaoId_key" ON "comites_digitais"("solicitacaoId");
CREATE INDEX "comites_digitais_status_idx" ON "comites_digitais"("status");
CREATE UNIQUE INDEX "votos_comite_comiteId_votanteId_key" ON "votos_comite"("comiteId", "votanteId");
CREATE INDEX "votos_comite_comiteId_idx" ON "votos_comite"("comiteId");

-- AddForeignKey
ALTER TABLE "solicitacoes_credito" ADD CONSTRAINT "solicitacoes_credito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comites_digitais" ADD CONSTRAINT "comites_digitais_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes_credito"("solicitacaoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_comite" ADD CONSTRAINT "votos_comite_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites_digitais"("comiteId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos_comite" ADD CONSTRAINT "votos_comite_votanteId_fkey" FOREIGN KEY ("votanteId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
