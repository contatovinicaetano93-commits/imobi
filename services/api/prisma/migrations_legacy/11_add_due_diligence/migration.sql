CREATE TYPE "DueDiligenceStatus" AS ENUM ('RASCUNHO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'REPROVADO');

CREATE TABLE "DueDiligence" (
  "id" TEXT NOT NULL,
  "gestorId" TEXT NOT NULL,
  "nomeEmpreendimento" TEXT NOT NULL,
  "tipologia" TEXT,
  "endereco" TEXT,
  "cidade" TEXT,
  "uf" TEXT,
  "totalUnidades" INTEGER,
  "areaTotal" DOUBLE PRECISION,
  "dataEntregaPrevista" TIMESTAMP(3),
  "nomeIncorporadora" TEXT,
  "cnpjIncorporadora" TEXT,
  "modeloAmortizacao" TEXT,
  "totalCarteira" DOUBLE PRECISION,
  "totalAReceber" DOUBLE PRECISION,
  "estruturaSocietaria" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" "DueDiligenceStatus" NOT NULL DEFAULT 'RASCUNHO',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DueDiligence_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DueDiligence" ADD CONSTRAINT "DueDiligence_gestorId_fkey"
  FOREIGN KEY ("gestorId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "DueDiligence_gestorId_idx" ON "DueDiligence"("gestorId");
CREATE INDEX "DueDiligence_status_idx" ON "DueDiligence"("status");
