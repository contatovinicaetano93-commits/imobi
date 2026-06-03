-- Add commercial CRM module: pipeline stages, leads, conversion scoring, activities

-- Enums
CREATE TYPE "ComercialRole" AS ENUM ('GERENTE_VENDAS', 'REPRESENTANTE');
CREATE TYPE "LeadFonte" AS ENUM ('WEBSITE', 'INDICACAO', 'MARKETPLACE', 'CAMPANHA_DIGITAL', 'OFFLINE', 'PARCEIRO');
CREATE TYPE "LeadSegmento" AS ENUM ('NOVO', 'RETORNO', 'CONCORRENTE');
CREATE TYPE "LeadActivityTipo" AS ENUM (
  'CALL_OUTBOUND', 'CALL_INBOUND', 'EMAIL_SENT', 'EMAIL_RECEIVED',
  'MEETING_SCHEDULED', 'MEETING_COMPLETED', 'PROPOSAL_SENT',
  'DOCUMENT_REQUESTED', 'PAYMENT_RECEIVED', 'STAGE_CHANGED',
  'NOTE_ADDED', 'FOLLOW_UP_SET'
);

-- Add comercialRole to Usuario
ALTER TABLE "Usuario" ADD COLUMN "comercialRole" "ComercialRole";

-- PipelineStage
CREATE TABLE "PipelineStage" (
    "stageId"        TEXT NOT NULL,
    "nome"           TEXT NOT NULL,
    "ordem"          INTEGER NOT NULL,
    "descricao"      TEXT,
    "corHex"         TEXT NOT NULL DEFAULT '#999999',
    "taxaConversao"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "diasMedioStage" INTEGER NOT NULL DEFAULT 7,
    "criadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("stageId")
);
CREATE UNIQUE INDEX "PipelineStage_nome_key"  ON "PipelineStage"("nome");
CREATE UNIQUE INDEX "PipelineStage_ordem_key" ON "PipelineStage"("ordem");
CREATE INDEX "PipelineStage_ordem_idx" ON "PipelineStage"("ordem");

-- Lead
CREATE TABLE "Lead" (
    "leadId"                 TEXT NOT NULL,
    "obraId"                 TEXT,
    "usuarioId"              TEXT,
    "atribuidoEm"            TIMESTAMP(3),
    "clienteNome"            TEXT NOT NULL,
    "clienteEmail"           TEXT NOT NULL,
    "clienteTelefone"        TEXT NOT NULL,
    "clienteCpf"             TEXT,
    "stageId"                TEXT NOT NULL,
    "fonte"                  "LeadFonte" NOT NULL DEFAULT 'WEBSITE',
    "tipoObra"               TEXT,
    "segmentoCliente"        "LeadSegmento" NOT NULL DEFAULT 'NOVO',
    "condicoes"              TEXT,
    "proximoAcompanhamento"  TIMESTAMP(3),
    "statusUltimo"           TEXT,
    "criadoEm"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm"           TIMESTAMP(3) NOT NULL,
    "convertidoEm"           TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("leadId")
);
CREATE INDEX "Lead_obraId_idx"          ON "Lead"("obraId");
CREATE INDEX "Lead_usuarioId_idx"       ON "Lead"("usuarioId");
CREATE INDEX "Lead_stageId_idx"         ON "Lead"("stageId");
CREATE INDEX "Lead_fonte_idx"           ON "Lead"("fonte");
CREATE INDEX "Lead_segmentoCliente_idx" ON "Lead"("segmentoCliente");
CREATE INDEX "Lead_criadoEm_idx"        ON "Lead"("criadoEm");
CREATE INDEX "Lead_convertidoEm_idx"    ON "Lead"("convertidoEm");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_obraId_fkey"
    FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("stageId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ConversionScore
CREATE TABLE "ConversionScore" (
    "scoreId"                TEXT NOT NULL,
    "leadId"                 TEXT NOT NULL,
    "scoreFinal"             DOUBLE PRECISION NOT NULL,
    "probabilidadeClosing"   DOUBLE PRECISION NOT NULL,
    "dataEstimadaClosing"    TIMESTAMP(3),
    "fonteScore"             DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tipoObraScore"          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "segmentoScore"          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "engajamentoScore"       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "historicoScore"         DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "versaoAlgoritmo"        TEXT NOT NULL DEFAULT 'v1',
    "criadoEm"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionScore_pkey" PRIMARY KEY ("scoreId")
);
CREATE INDEX "ConversionScore_leadId_idx"       ON "ConversionScore"("leadId");
CREATE INDEX "ConversionScore_scoreFinal_idx"   ON "ConversionScore"("scoreFinal");
CREATE INDEX "ConversionScore_atualizadoEm_idx" ON "ConversionScore"("atualizadoEm");

ALTER TABLE "ConversionScore" ADD CONSTRAINT "ConversionScore_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("leadId") ON DELETE CASCADE ON UPDATE CASCADE;

-- LeadActivity
CREATE TABLE "LeadActivity" (
    "atividadeId" TEXT NOT NULL,
    "leadId"      TEXT NOT NULL,
    "tipo"        "LeadActivityTipo" NOT NULL,
    "descricao"   TEXT NOT NULL,
    "usuarioId"   TEXT NOT NULL,
    "criadoEm"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("atividadeId")
);
CREATE INDEX "LeadActivity_leadId_idx"  ON "LeadActivity"("leadId");
CREATE INDEX "LeadActivity_tipo_idx"    ON "LeadActivity"("tipo");
CREATE INDEX "LeadActivity_criadoEm_idx" ON "LeadActivity"("criadoEm");

ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("leadId") ON DELETE CASCADE ON UPDATE CASCADE;
