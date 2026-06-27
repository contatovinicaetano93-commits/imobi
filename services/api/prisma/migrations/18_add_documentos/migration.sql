CREATE TYPE "DocumentoTipo" AS ENUM ('CONTRATO', 'GARANTIA', 'MATRICULA', 'ART', 'ALVARA', 'SEGURO', 'PROCURACAO', 'ESCRITURA', 'HABITE_SE', 'OUTROS');

CREATE TABLE "documentos" (
  "documentoId"  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "obraId"       TEXT,
  "usuarioId"    TEXT NOT NULL,
  "tipo"         "DocumentoTipo" NOT NULL DEFAULT 'OUTROS',
  "nome"         TEXT NOT NULL,
  "url"          TEXT NOT NULL,
  "mimeType"     TEXT NOT NULL DEFAULT 'application/pdf',
  "tamanhoBytes" INTEGER,
  "descricao"    TEXT,
  "vencimento"   TIMESTAMP(3),
  "criadoEm"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "documentos_pkey" PRIMARY KEY ("documentoId")
);

ALTER TABLE "documentos" ADD CONSTRAINT "documentos_obraId_fkey"
  FOREIGN KEY ("obraId") REFERENCES "Obra"("obraId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documentos" ADD CONSTRAINT "documentos_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;
