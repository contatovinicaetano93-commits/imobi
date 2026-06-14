-- AddValue to EtapaStatus enum (must run outside transaction in PostgreSQL)
ALTER TYPE "EtapaStatus" ADD VALUE IF NOT EXISTS 'APROVADA_ENGENHEIRO' AFTER 'AGUARDANDO_VISTORIA';

-- AddValue to UsuarioTipo enum
ALTER TYPE "UsuarioTipo" ADD VALUE IF NOT EXISTS 'GESTOR_FUNDO' AFTER 'CONSTRUTOR';
