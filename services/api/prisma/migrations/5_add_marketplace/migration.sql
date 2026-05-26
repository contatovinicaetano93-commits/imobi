-- Create parceiros (contractors) table
CREATE TABLE "parceiros" (
  "parceiroId" TEXT NOT NULL PRIMARY KEY,
  "usuarioId" TEXT NOT NULL UNIQUE,
  "descricao" TEXT,
  "especialidades" TEXT[],
  "telefone" TEXT,
  "endereco" TEXT,
  "mediaAvaliacao" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "totalAvaliacoes" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "parceiros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE
);

-- Create servicos_oferece (services offered) table
CREATE TABLE "servicos_oferece" (
  "servicoId" TEXT NOT NULL PRIMARY KEY,
  "parceiroId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "preco" DOUBLE PRECISION NOT NULL,
  "estimadoHoras" INTEGER,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "servicos_oferece_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("parceiroId") ON DELETE CASCADE
);

-- Create vistorias (inspections/bookings) table
CREATE TABLE "vistorias" (
  "vistoriaId" TEXT NOT NULL PRIMARY KEY,
  "etapaId" TEXT NOT NULL,
  "parceiroId" TEXT NOT NULL,
  "servicoId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "dataAgendada" TIMESTAMP(3),
  "dataRealizada" TIMESTAMP(3),
  "observacao" TEXT,
  "precoAcordado" DOUBLE PRECISION,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vistorias_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "EtapaObra"("etapaId") ON DELETE CASCADE,
  CONSTRAINT "vistorias_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("parceiroId") ON DELETE RESTRICT,
  CONSTRAINT "vistorias_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servicos_oferece"("servicoId") ON DELETE SET NULL
);

-- Create avaliacoes_parceiro (contractor reviews) table
CREATE TABLE "avaliacoes_parceiro" (
  "avaliacaoId" TEXT NOT NULL PRIMARY KEY,
  "parceiroId" TEXT NOT NULL,
  "vistoriaId" TEXT,
  "usuarioId" TEXT NOT NULL,
  "estrelas" INTEGER NOT NULL,
  "comentario" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "avaliacoes_parceiro_parceiroId_fkey" FOREIGN KEY ("parceiroId") REFERENCES "parceiros"("parceiroId") ON DELETE CASCADE,
  CONSTRAINT "avaliacoes_parceiro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE,
  CONSTRAINT "avaliacoes_parceiro_parceiroId_vistoriaId_usuarioId_key" UNIQUE("parceiroId", "vistoriaId", "usuarioId")
);

-- Create indexes for performance
CREATE INDEX "parceiros_ativo_idx" ON "parceiros"("ativo");
CREATE INDEX "parceiros_mediaAvaliacao_idx" ON "parceiros"("mediaAvaliacao");
CREATE INDEX "servicos_oferece_parceiroId_idx" ON "servicos_oferece"("parceiroId");
CREATE INDEX "servicos_oferece_ativo_idx" ON "servicos_oferece"("ativo");
CREATE INDEX "vistorias_etapaId_idx" ON "vistorias"("etapaId");
CREATE INDEX "vistorias_parceiroId_idx" ON "vistorias"("parceiroId");
CREATE INDEX "vistorias_status_idx" ON "vistorias"("status");
CREATE INDEX "avaliacoes_parceiro_parceiroId_idx" ON "avaliacoes_parceiro"("parceiroId");
CREATE INDEX "avaliacoes_parceiro_usuarioId_idx" ON "avaliacoes_parceiro"("usuarioId");
