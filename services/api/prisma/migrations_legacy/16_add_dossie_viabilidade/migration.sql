-- CreateEnum
CREATE TYPE "EstagioObraDossie" AS ENUM ('NOVO', 'EM_ANDAMENTO', 'ENTRADA_TARDIA');

-- CreateEnum
CREATE TYPE "DossieChecklistItemStatus" AS ENUM ('PENDENTE', 'ENVIADO', 'APROVADO', 'REPROVADO', 'NA');

-- AlterTable: evolve DueDiligence for tomador-owned dossies
ALTER TABLE "DueDiligence" ADD COLUMN "usuarioId" TEXT;
ALTER TABLE "DueDiligence" ADD COLUMN "obraId" TEXT;
ALTER TABLE "DueDiligence" ADD COLUMN "estagioObra" "EstagioObraDossie";
ALTER TABLE "DueDiligence" ADD COLUMN "percentualFisico" DOUBLE PRECISION;
ALTER TABLE "DueDiligence" ADD COLUMN "dataBase" TIMESTAMP(3);
ALTER TABLE "DueDiligence" ADD COLUMN "observacaoAdmin" TEXT;
ALTER TABLE "DueDiligence" ADD COLUMN "enviadoEm" TIMESTAMP(3);
ALTER TABLE "DueDiligence" ALTER COLUMN "gestorId" DROP NOT NULL;
ALTER TABLE "DueDiligence" ALTER COLUMN "payload" SET DEFAULT '{}';

-- Backfill tomador from legacy gestor records
UPDATE "DueDiligence" SET "usuarioId" = "gestorId" WHERE "usuarioId" IS NULL;

ALTER TABLE "DueDiligence" ALTER COLUMN "usuarioId" SET NOT NULL;

-- CreateTable
CREATE TABLE "DossieChecklistItem" (
    "id" TEXT NOT NULL,
    "dossieId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "status" "DossieChecklistItemStatus" NOT NULL DEFAULT 'PENDENTE',
    "documentoId" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DossieChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossieAuditLog" (
    "id" TEXT NOT NULL,
    "dossieId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DossieAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DueDiligence_usuarioId_idx" ON "DueDiligence"("usuarioId");
CREATE INDEX "DueDiligence_obraId_idx" ON "DueDiligence"("obraId");
CREATE UNIQUE INDEX "DossieChecklistItem_dossieId_itemId_key" ON "DossieChecklistItem"("dossieId", "itemId");
CREATE INDEX "DossieChecklistItem_dossieId_idx" ON "DossieChecklistItem"("dossieId");
CREATE INDEX "DossieChecklistItem_status_idx" ON "DossieChecklistItem"("status");
CREATE INDEX "DossieAuditLog_dossieId_idx" ON "DossieAuditLog"("dossieId");
CREATE INDEX "DossieAuditLog_usuarioId_idx" ON "DossieAuditLog"("usuarioId");

-- AddForeignKey
ALTER TABLE "DueDiligence" ADD CONSTRAINT "DueDiligence_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DueDiligence" ADD CONSTRAINT "DueDiligence_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DossieChecklistItem" ADD CONSTRAINT "DossieChecklistItem_dossieId_fkey" FOREIGN KEY ("dossieId") REFERENCES "DueDiligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DossieAuditLog" ADD CONSTRAINT "DossieAuditLog_dossieId_fkey" FOREIGN KEY ("dossieId") REFERENCES "DueDiligence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DossieAuditLog" ADD CONSTRAINT "DossieAuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
