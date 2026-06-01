# Database Optimization Guide

## Current Indexes

The following indexes have been implemented to optimize query performance:

### User Indexes
```sql
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_cpf ON usuario(cpf);
CREATE INDEX idx_usuario_telefone ON usuario(telefone);
```

### Work/Obra Indexes
```sql
CREATE INDEX idx_obra_usuario_id ON obra(usuario_id);
CREATE INDEX idx_obra_status ON obra(status);
CREATE INDEX idx_obra_data_criacao ON obra(data_criacao DESC);
CREATE INDEX idx_obra_localizacao ON obra USING GIST(localizacao);
```

### Evidence/Evidência Indexes
```sql
CREATE INDEX idx_evidencia_obra_id ON evidencia(obra_id);
CREATE INDEX idx_evidencia_data_upload ON evidencia(data_upload DESC);
CREATE INDEX idx_evidencia_localizacao ON evidencia USING GIST(localizacao);
```

### Installment/Parcela Indexes
```sql
CREATE INDEX idx_parcela_obra_id ON parcela(obra_id);
CREATE INDEX idx_parcela_status ON parcela(status);
CREATE INDEX idx_parcela_data_vencimento ON parcela(data_vencimento);
```

### KYC Indexes
```sql
CREATE INDEX idx_kyc_usuario_id ON kyc(usuario_id);
CREATE INDEX idx_kyc_status ON kyc(status);
CREATE INDEX idx_documento_kyc_id ON documento_kyc(kyc_id);
```

## Query Optimization

### 1. N+1 Problem Prevention

Always use eager loading with Prisma:

```typescript
// Bad - N+1 queries
const obras = await prisma.obra.findMany();
for (const obra of obras) {
  const evidencias = await prisma.evidencia.findMany({
    where: { obraId: obra.id }
  });
}

// Good - Single query with relations
const obras = await prisma.obra.findMany({
  include: {
    evidencias: true,
    parcelas: true,
    usuario: true
  }
});
```

### 2. Pagination

Always paginate large result sets:

```typescript
const obras = await prisma.obra.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { dataCriacao: 'desc' },
  include: { evidencias: true }
});
```

### 3. Selective Field Selection

Only fetch required fields:

```typescript
// Reduce payload size
const obras = await prisma.obra.findMany({
  select: {
    id: true,
    titulo: true,
    status: true,
    valor: true,
    dataCriacao: true
  }
});
```

### 4. Complex Queries with Raw SQL

For complex operations, use raw queries:

```typescript
const result = await prisma.$queryRaw`
  SELECT 
    o.id,
    o.titulo,
    COUNT(e.id) as evidencia_count,
    AVG(ST_Distance(e.localizacao, o.localizacao)) as avg_distance
  FROM obra o
  LEFT JOIN evidencia e ON o.id = e.obra_id
  WHERE o.usuario_id = ${userId}
  GROUP BY o.id
  ORDER BY o.data_criacao DESC
  LIMIT ${limit} OFFSET ${offset}
`;
```

## Caching Strategy

### Redis Cache Keys

```typescript
// User data
usuario:${userId} -> TTL: 1 hour
usuario_obras:${userId} -> TTL: 30 minutes

// Work data
obra:${obraId} -> TTL: 30 minutes
obra_evidencias:${obraId} -> TTL: 15 minutes

// KYC data
kyc:${userId} -> TTL: 1 hour

// Credit simulation (time-sensitive)
credito_simular:${userId}:${valor}:${prazo} -> TTL: 5 minutes
```

### Cache Invalidation

```typescript
// When user updates
await redis.del(`usuario:${userId}`);
await redis.del(`usuario_obras:${userId}`);

// When work is updated
await redis.del(`obra:${obraId}`);
await redis.del(`obra_evidencias:${obraId}`);
await redis.del(`usuario_obras:${userId}`);

// When evidence is uploaded
await redis.del(`obra_evidencias:${obraId}`);
```

## Database Connection Pooling

Configure connection pool in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/imbobi?schema=public&connection_limit=20"
```

Prisma settings in `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Monitoring Slow Queries

Enable PostgreSQL query logging:

```sql
-- Log queries slower than 1 second
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- View logs
SELECT * FROM pg_logs ORDER BY log_time DESC LIMIT 100;
```

## Regular Maintenance

### 1. Vacuum and Analyze

```sql
-- Weekly maintenance
VACUUM ANALYZE;

-- For specific tables
VACUUM ANALYZE usuario;
VACUUM ANALYZE obra;
VACUUM ANALYZE evidencia;
```

### 2. Reindex

```sql
-- Monthly reindexing
REINDEX INDEX CONCURRENTLY idx_obra_usuario_id;
REINDEX INDEX CONCURRENTLY idx_evidencia_obra_id;
```

### 3. Check Table Sizes

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Performance Benchmarks

Target response times:

| Endpoint | Target | Notes |
|----------|--------|-------|
| GET /obras | < 200ms | With caching |
| GET /kyc/status | < 100ms | Cached |
| POST /evidencias | < 1s | File upload included |
| GET /credito/simular | < 50ms | Cached for 5min |
| GET /parcelas | < 150ms | With caching |

## Batch Operations

For bulk inserts/updates:

```typescript
// Batch insert evidencias
const createMany = await prisma.evidencia.createMany({
  data: evidencias,
  skipDuplicates: true
});

// Batch update
const updated = await prisma.parcela.updateMany({
  where: {
    dataVencimento: { lte: new Date() },
    status: 'ABERTA'
  },
  data: {
    status: 'VENCIDA'
  }
});
```

## Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# Daily automated backup
BACKUP_DIR="/var/backups/imbobi"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump $DATABASE_URL > "$BACKUP_DIR/imbobi_$TIMESTAMP.sql"

# Keep only last 30 days
find $BACKUP_DIR -name "imbobi_*.sql" -mtime +30 -delete
```

### Point-in-Time Recovery

Enable WAL archiving in PostgreSQL:

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /backup/wal_archive/%f && cp %p /backup/wal_archive/%f'
```

## Resource Limits

Configure PostgreSQL resource management:

```sql
-- Maximum connections
ALTER SYSTEM SET max_connections = 200;

-- Shared memory
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Work memory per operation
ALTER SYSTEM SET work_mem = '16MB';

-- Reload configuration
SELECT pg_reload_conf();
```

## Common Slow Query Solutions

### 1. Geospatial Queries

Use PostGIS properly:

```sql
-- Bad
SELECT * FROM obra 
WHERE ST_Distance(localizacao, ST_Point(-46.6333, -23.5505)) < 5000;

-- Good - use index
SELECT * FROM obra 
WHERE localizacao <-> ST_Point(-46.6333, -23.5505) < 5000
ORDER BY localizacao <-> ST_Point(-46.6333, -23.5505)
LIMIT 10;
```

### 2. Large JSON Fields

Use JSONQuery instead of full column retrieval:

```sql
-- Bad
SELECT data FROM usuario WHERE data->>'cpf' = '12345678901';

-- Good - use index
CREATE INDEX idx_usuario_cpf_json ON usuario USING GIN(data);
SELECT data FROM usuario WHERE data @> '{"cpf":"12345678901"}';
```

### 3. Time Range Queries

Always use indexes with BRIN for time series:

```sql
CREATE INDEX idx_evidencia_data_brin 
  ON evidencia USING BRIN(data_upload)
  WITH (pages_per_range = 128);
```
