CREATE TYPE "MailingStatus" AS ENUM ('NOVO', 'CONTATADO', 'CONVERTIDO');

CREATE TABLE "MailingContato" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "telefone" TEXT,
  "status" "MailingStatus" NOT NULL DEFAULT 'NOVO',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MailingContato_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MailingContato" ADD CONSTRAINT "MailingContato_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MailingContato_usuarioId_idx" ON "MailingContato"("usuarioId");
