CREATE TYPE "FornecedorTipo" AS ENUM (
  'MATERIAL_CONSTRUCAO',
  'MAO_DE_OBRA',
  'EQUIPAMENTO',
  'PROJETO_ARQUITETURA',
  'ENGENHARIA',
  'OUTROS'
);

CREATE TABLE "fornecedores" (
  "fornecedorId"    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nome"            TEXT NOT NULL,
  "tipo"            "FornecedorTipo" NOT NULL,
  "descricao"       TEXT,
  "website"         TEXT,
  "telefone"        TEXT,
  "email"           TEXT,
  "endereco"        TEXT,
  "uf"              TEXT,
  "cidade"          TEXT,
  "geoLatitude"     DOUBLE PRECISION,
  "geoLongitude"    DOUBLE PRECISION,
  "avaliacaoMedia"  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "totalAvaliacoes" INTEGER NOT NULL DEFAULT 0,
  "ativo"           BOOLEAN NOT NULL DEFAULT true,
  "criadoEm"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("fornecedorId")
);

CREATE TABLE "avaliacoes_fornecedor" (
  "avaliacaoId"   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "fornecedorId"  TEXT NOT NULL,
  "usuarioId"     TEXT NOT NULL,
  "nota"          INTEGER NOT NULL,
  "comentario"    TEXT,
  "criadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "avaliacoes_fornecedor_pkey" PRIMARY KEY ("avaliacaoId")
);

CREATE INDEX "fornecedores_tipo_idx" ON "fornecedores"("tipo");
CREATE INDEX "fornecedores_uf_idx" ON "fornecedores"("uf");
CREATE INDEX "fornecedores_ativo_idx" ON "fornecedores"("ativo");
CREATE INDEX "avaliacoes_fornecedor_fornecedorId_idx" ON "avaliacoes_fornecedor"("fornecedorId");
CREATE UNIQUE INDEX "avaliacoes_fornecedor_fornecedorId_usuarioId_key" ON "avaliacoes_fornecedor"("fornecedorId", "usuarioId");

ALTER TABLE "avaliacoes_fornecedor"
  ADD CONSTRAINT "avaliacoes_fornecedor_fornecedorId_fkey"
  FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("fornecedorId") ON DELETE CASCADE ON UPDATE CASCADE;
