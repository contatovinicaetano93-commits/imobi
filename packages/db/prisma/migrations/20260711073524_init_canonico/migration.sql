-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENTE', 'FUNDO', 'ENGENHEIRO');

-- CreateEnum
CREATE TYPE "EtapaFunil" AS ENUM ('KYC_PENDENTE', 'DOSSIE_EM_ANALISE', 'APROVADO', 'OBRA_CADASTRADA', 'HOMOLOGADA', 'EM_ANDAMENTO', 'QUITADO');

-- CreateEnum
CREATE TYPE "DocumentoStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TrancheStatus" AS ENUM ('PENDENTE', 'VALIDADA_ENGENHEIRO', 'LIBERADA_ADMIN', 'REJEITADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "valorCredito" DECIMAL(14,2) NOT NULL,
    "etapa" "EtapaFunil" NOT NULL DEFAULT 'KYC_PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "clienteId" TEXT NOT NULL,
    "engenheiroId" TEXT,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "DocumentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraId" TEXT NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tranches" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "status" "TrancheStatus" NOT NULL DEFAULT 'PENDENTE',
    "validadoPorId" TEXT,
    "validadoEm" TIMESTAMP(3),
    "liberadoPorId" TEXT,
    "liberadoEm" TIMESTAMP(3),
    "obraId" TEXT NOT NULL,

    CONSTRAINT "tranches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trancheId" TEXT NOT NULL,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_etapas" (
    "id" TEXT NOT NULL,
    "etapa" "EtapaFunil" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraId" TEXT NOT NULL,
    "usuarioId" TEXT,

    CONSTRAINT "historico_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "obras_clienteId_idx" ON "obras"("clienteId");

-- CreateIndex
CREATE INDEX "obras_engenheiroId_idx" ON "obras"("engenheiroId");

-- CreateIndex
CREATE INDEX "obras_etapa_idx" ON "obras"("etapa");

-- CreateIndex
CREATE INDEX "documentos_obraId_idx" ON "documentos"("obraId");

-- CreateIndex
CREATE INDEX "tranches_obraId_idx" ON "tranches"("obraId");

-- CreateIndex
CREATE INDEX "evidencias_trancheId_idx" ON "evidencias"("trancheId");

-- CreateIndex
CREATE INDEX "historico_etapas_obraId_idx" ON "historico_etapas"("obraId");

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_engenheiroId_fkey" FOREIGN KEY ("engenheiroId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tranches" ADD CONSTRAINT "tranches_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tranches" ADD CONSTRAINT "tranches_liberadoPorId_fkey" FOREIGN KEY ("liberadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tranches" ADD CONSTRAINT "tranches_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "tranches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_etapas" ADD CONSTRAINT "historico_etapas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
