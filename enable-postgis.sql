-- Enable PostGIS extension for imobi RDS database
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify installation
SELECT postgis_version();

-- Test geometry support
SELECT ST_AsText(ST_GeomFromText('POINT(-23.5505 -46.6333)', 4326)) as sao_paulo;

-- Grant permissions to imobi_admin user
GRANT USAGE ON SCHEMA public TO imobi_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO imobi_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO imobi_admin;

SELECT 'PostGIS enabled successfully!' as status;
