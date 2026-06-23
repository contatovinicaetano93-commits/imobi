# Fix P3009 no Postgres do Railway (Query tab do serviço Postgres)
# Só use DEPOIS de trocar para template PostGIS — senão 0_init falha de novo.

-- 1) Estado
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at;

-- 2) PostGIS (template PostGIS já tem; vanilla não)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3) Se schema vazio (Usuario não existe) — marcar 0_init rolled-back
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '0_init'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;

-- 4) Redeploy API no Railway
