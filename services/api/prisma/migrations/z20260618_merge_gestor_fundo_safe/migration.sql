-- Final order-safe merge for legacy GESTOR_FUNDO users after all role enum values exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UsuarioTipo' AND e.enumlabel = 'GESTOR'
  ) AND EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UsuarioTipo' AND e.enumlabel = 'GESTOR_FUNDO'
  ) THEN
    UPDATE "Usuario" SET tipo = 'GESTOR' WHERE tipo = 'GESTOR_FUNDO';
  END IF;
END $$;
