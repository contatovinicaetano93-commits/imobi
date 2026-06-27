-- Renomeia registros em _prisma_migrations após reorder das pastas (00–09 antes de 10+).
-- Idempotente: só altera linhas com o nome antigo.
--
-- Uso (staging Render):
--   psql "$DATABASE_URL" -f scripts/sql/rename-prisma-migration-names.sql
--   ou: pnpm db:rename-migrations -- --staging
--
-- Depois:
--   pnpm db:migrate:deploy:staging

BEGIN;

-- Diagnóstico antes
SELECT migration_name, finished_at
FROM "_prisma_migrations"
ORDER BY finished_at;

-- 0–9 → 00–09 (ordem lexicográfica corrigida)
UPDATE "_prisma_migrations" SET migration_name = '00_init' WHERE migration_name = '0_init';
UPDATE "_prisma_migrations" SET migration_name = '01_add_notifications' WHERE migration_name = '1_add_notifications';
UPDATE "_prisma_migrations" SET migration_name = '02_add_kyc_documents' WHERE migration_name = '2_add_kyc_documents';
UPDATE "_prisma_migrations" SET migration_name = '03_add_performance_indexes' WHERE migration_name = '3_add_performance_indexes';
UPDATE "_prisma_migrations" SET migration_name = '04_add_audit_logs' WHERE migration_name = '4_add_audit_logs';
UPDATE "_prisma_migrations" SET migration_name = '05_add_usuario_deletado_em' WHERE migration_name = '5_add_usuario_deletado_em';
UPDATE "_prisma_migrations" SET migration_name = '06_add_lgpd_consent_fields' WHERE migration_name = '6_add_lgpd_consent_fields';
UPDATE "_prisma_migrations" SET migration_name = '07_add_comercial_pipeline' WHERE migration_name = '7_add_comercial_pipeline';
UPDATE "_prisma_migrations" SET migration_name = '08_add_password_reset' WHERE migration_name = '8_add_password_reset';
UPDATE "_prisma_migrations" SET migration_name = '09_add_staff_roles' WHERE migration_name = '9_add_staff_roles';

-- Timestamps → sequência 18–19
UPDATE "_prisma_migrations"
SET migration_name = '18_add_documentos',
    -- checksum do migration.sql atual (FK Obra/Usuario corrigidos)
    checksum = 'ceabce95e4f167c3e621738fb80f7c7008a4baa4d6357737b4f6afb6298e4675'
WHERE migration_name = '20260612_add_documentos';

UPDATE "_prisma_migrations"
SET migration_name = '19_add_obra_homologada_notification'
WHERE migration_name = '20260623010920_add_obra_homologada_notification';

-- Diagnóstico depois
SELECT migration_name, finished_at
FROM "_prisma_migrations"
ORDER BY finished_at;

COMMIT;
