-- CreateTable: configuracoes_sistema (singleton row)
CREATE TABLE IF NOT EXISTS "configuracoes_sistema" (
    "id"                          TEXT NOT NULL DEFAULT 'singleton',
    "taxaMensalMin"               DOUBLE PRECISION NOT NULL DEFAULT 0.89,
    "taxaMensalMax"               DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "taxaPadrao"                  DOUBLE PRECISION NOT NULL DEFAULT 1.89,
    "valorMinCredito"             DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "valorMaxCredito"             DOUBLE PRECISION NOT NULL DEFAULT 5000000,
    "prazoMaxMeses"               INTEGER NOT NULL DEFAULT 60,
    "raioValidacaoMetrosPadrao"   INTEGER NOT NULL DEFAULT 100,
    "toleranciaPrecisaoGps"       INTEGER NOT NULL DEFAULT 20,
    "diasAprovacao"               INTEGER NOT NULL DEFAULT 15,
    "limiteEvidenciasMB"          INTEGER NOT NULL DEFAULT 10,
    "modoManutencao"              BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "configuracoes_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable: capital_fundo (singleton row)
CREATE TABLE IF NOT EXISTS "capital_fundo" (
    "id"                TEXT NOT NULL DEFAULT 'singleton',
    "capitalDisponivel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atualizadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "capital_fundo_pkey" PRIMARY KEY ("id")
);

-- Seed default singleton rows
INSERT INTO "configuracoes_sistema" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;
INSERT INTO "capital_fundo" ("id") VALUES ('singleton') ON CONFLICT ("id") DO NOTHING;
