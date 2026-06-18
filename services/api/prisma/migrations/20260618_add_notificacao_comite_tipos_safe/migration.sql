-- Ensure comite notification enum values exist after TipoNotificacao is created.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoNotificacao') THEN
    ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'PARECER_SOLICITADO';
    ALTER TYPE "TipoNotificacao" ADD VALUE IF NOT EXISTS 'COMITE_DECISAO';
  END IF;
END $$;
