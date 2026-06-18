-- Consolidate UsuarioTipo to the five official system roles:
-- TOMADOR, PARCEIRO, GESTOR, ENGENHEIRO, ADMIN.
--
-- Legacy mappings:
--   CONSTRUTOR   -> TOMADOR
--   COMERCIAL    -> PARCEIRO
--   GESTOR_OBRA  -> ENGENHEIRO
--   GESTOR_FUNDO -> GESTOR

ALTER TABLE "Usuario" ALTER COLUMN "tipo" DROP DEFAULT;

UPDATE "Usuario"
SET "tipo" = CASE "tipo"::text
  WHEN 'CONSTRUTOR' THEN 'TOMADOR'::"UsuarioTipo"
  WHEN 'COMERCIAL' THEN 'PARCEIRO'::"UsuarioTipo"
  WHEN 'GESTOR_OBRA' THEN 'ENGENHEIRO'::"UsuarioTipo"
  WHEN 'GESTOR_FUNDO' THEN 'GESTOR'::"UsuarioTipo"
  ELSE "tipo"
END;

ALTER TYPE "UsuarioTipo" RENAME TO "UsuarioTipo_old";

CREATE TYPE "UsuarioTipo" AS ENUM (
  'TOMADOR',
  'PARCEIRO',
  'GESTOR',
  'ENGENHEIRO',
  'ADMIN'
);

ALTER TABLE "Usuario"
  ALTER COLUMN "tipo" TYPE "UsuarioTipo"
  USING "tipo"::text::"UsuarioTipo";

ALTER TABLE "Usuario" ALTER COLUMN "tipo" SET DEFAULT 'TOMADOR';

DROP TYPE "UsuarioTipo_old";
