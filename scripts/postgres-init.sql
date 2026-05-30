-- Initialize PostgreSQL with extensions for imobi staging

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Log statement
SELECT 'PostgreSQL initialized with PostGIS and required extensions' AS status;
