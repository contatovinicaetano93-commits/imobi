-- Configurações globais de crédito e validação (singleton admin)

CREATE TABLE "configuracao_sistema" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "taxaMensalMin" DOUBLE PRECISION NOT NULL DEFAULT 0.89,
    "taxaMensalMax" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "taxaPadrao" DOUBLE PRECISION NOT NULL DEFAULT 1.89,
    "valorMinCredito" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "valorMaxCredito" DOUBLE PRECISION NOT NULL DEFAULT 5000000,
    "prazoMaxMeses" INTEGER NOT NULL DEFAULT 60,
    "raioValidacaoMetrosPadrao" INTEGER NOT NULL DEFAULT 100,
    "toleranciaPrecisaoGps" INTEGER NOT NULL DEFAULT 20,
    "diasAprovacao" INTEGER NOT NULL DEFAULT 15,
    "limiteEvidenciasMB" INTEGER NOT NULL DEFAULT 10,
    "modoManutencao" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_sistema_pkey" PRIMARY KEY ("id")
);

INSERT INTO "configuracao_sistema" ("id", "atualizadoEm")
VALUES ('global', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
