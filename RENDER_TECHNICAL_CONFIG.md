# imobi — Render Technical Configuration Reference

**Detailed technical specifications, constraints, and configuration details**

---

## Database Configuration

### PostgreSQL Specification

```yaml
Database:
  Version: 14.9 (minimum 14+)
  Provider: Render PostgreSQL
  Database Name: imobi_staging
  
Connection:
  Protocol: postgresql (psycopg3)
  Port: 5432
  SSL/TLS: Enabled by default
  Connection Timeout: 30 seconds
  Idle Timeout: 900 seconds (15 minutes)
  
Performance:
  Max Connections: 25-100 (depends on instance type)
  Effective Cache Size: Instance-dependent
  Shared Buffers: ~25% of RAM
  Work Memory: Per-query allocation
  
Storage:
  Initial Size: ~100MB
  Growth: Automatic scaling available
  Backup: Daily, 7-day retention
```

### Prisma Configuration

**File**: `/services/api/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**Required Environment Variable**:
```
DATABASE_URL=postgresql://user:password@host:5432/imobi_staging?schema=public
```

### Connection Pool Management

**NestJS Configuration** (from `app.module.ts`):

- Default pool size: Managed by Prisma
- Max connections: 25 (Prisma default)
- Connection reuse: Enabled
- Idle timeout: 15 minutes

**Connection String Format**:
```
postgresql://user:password@host:5432/database?
  schema=public&
  sslmode=require&
  connect_timeout=30
```

---

## Redis Configuration

### Redis Specification

```yaml
Redis:
  Version: 7.x (minimum 7+)
  Provider: Render Redis
  
Connection:
  Protocol: RESP3 (Redis Serialization Protocol)
  Port: 6379
  SSL/TLS: Enabled by default
  Authentication: ACL with password
  
Memory Management:
  Eviction Policy: allkeys-lru (recommended)
  Max Memory: Instance-dependent (e.g., 256MB to 5GB)
  Used Memory Threshold: Alert at 75%
  
Persistence:
  AOF: Optional (for data durability)
  RDB: Optional (slower snapshots)
  Default: In-memory cache (no persistence)
```

### BullMQ Job Queue Configuration

**File**: `/services/api/src/app.module.ts`

```typescript
BullModule.registerQueue(
  {
    name: 'liberacao',  // QUEUE_LIBERACAO
    defaultJobOptions: {
      attempts: 3,      // Retry 3 times
      backoff: {
        type: 'exponential',
        delay: 2000     // 2s, 4s, 8s delays
      },
      removeOnComplete: true  // Clean up after success
    }
  },
  {
    name: 'score-update'  // Score update queue
  }
)
```

**Environment Variables**:
```yaml
REDIS_HOST: dpg-xxx.redis.render.com
REDIS_PORT: 6379
REDIS_PASSWORD: secure-auto-generated-password
```

### Connection String Parsing

From URL: `redis://:password@host:port`

```typescript
// Automatic parsing by NestJS CacheModule
CacheModule.register({
  store: 'redis',
  host: process.env.REDIS_HOST,      // 'dpg-xxx.redis.render.com'
  port: Number(process.env.REDIS_PORT), // 6379
  password: process.env.REDIS_PASSWORD, // 'secure-password'
  ttl: 300  // 5 minutes default
})
```

---

## Network & Security

### SSL/TLS Configuration

Both PostgreSQL and Redis require SSL/TLS:

**PostgreSQL Connection String**:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

**Redis Connection String**:
```
rediss://:password@host:port  # rediss = Redis over SSL
```

### Firewall & Network Access

**Render Internal Networking**:
- Databases are isolated to Render internal network
- Only Render services can access them by default
- Use "Internal" connection strings for Render-to-Render communication

**External Access** (for local development):
- Use "External" connection string
- Render provides automatic IP allowlisting
- Connection must use SSL/TLS

### Environment Variable Security

**Critical**: Store in Render dashboard ONLY

**Never commit to git**:
- `DATABASE_URL`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- AWS credentials
- Firebase keys
- SMTP passwords

**Safe to commit to git** (with `.example` suffix):
- `.env.example` (without actual values)
- Configuration schemas
- Default values

---

## Database Schema Details

### Tables and Relationships

**Core User Management**:
```sql
Usuario (
  usuarioId UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  cpf VARCHAR UNIQUE NOT NULL,
  passwordHash VARCHAR NOT NULL,
  tipo ENUM (TOMADOR, GESTOR_OBRA, ADMIN, PARCEIRO),
  kycStatus ENUM (PENDENTE, EM_VERIFICACAO, APROVADO, REJEITADO),
  criadoEm TIMESTAMP DEFAULT now(),
  atualizadoEm TIMESTAMP,
  deletadoEm TIMESTAMP NULL  -- Soft delete
)
```

**Credit & Finances**:
```sql
Credito (
  creditoId UUID PRIMARY KEY,
  usuarioId UUID FOREIGN KEY,
  valorAprovado FLOAT NOT NULL,
  valorLiberado FLOAT NOT NULL,
  taxaMensal FLOAT DEFAULT 0.0099,
  prazoMeses INT NOT NULL,
  status ENUM (ATIVO, SUSPENSO, VENCIDO, QUITADO),
  dataAprovacao TIMESTAMP,
  dataVencimento TIMESTAMP NULL
)

LiberacaoParcela (
  liberacaoId UUID PRIMARY KEY,
  creditoId UUID FOREIGN KEY,
  valor FLOAT NOT NULL,
  status ENUM (PENDENTE, PROCESSANDO, CONCLUIDA, FALHA),
  -- Processed asynchronously via BullMQ job queue
)
```

**Project Tracking**:
```sql
Obra (
  obraId UUID PRIMARY KEY,
  creditoId UUID FOREIGN KEY NULL,
  usuarioId UUID FOREIGN KEY,
  -- GPS Validation (PostGIS)
  geoLatitude FLOAT NOT NULL,
  geoLongitude FLOAT NOT NULL,
  raioValidacaoMetros INT DEFAULT 50,
  status ENUM (PLANEJAMENTO, EM_EXECUCAO, PAUSADA, CONCLUIDA, CANCELADA)
)

EvidenciaEtapa (
  evidenciaId UUID PRIMARY KEY,
  etapaId UUID FOREIGN KEY,
  obraId UUID FOREIGN KEY,
  -- Photo metadata with GPS validation
  latCaptura FLOAT NOT NULL,
  lngCaptura FLOAT NOT NULL,
  accuracyMetros FLOAT,
  distanciaObra FLOAT,  -- Calculated by PostGIS
  validada BOOLEAN DEFAULT FALSE
)
```

**KYC & Compliance**:
```sql
KycDocumento (
  kycDocumentoId UUID PRIMARY KEY,
  usuarioId UUID FOREIGN KEY,
  tipo VARCHAR (RG, CNH, Selfie, Comprovante Residência),
  url VARCHAR (S3 URL),
  status ENUM (PENDENTE, APROVADO, REJEITADO),
  analisadoPor UUID,  -- Reviewer
  analisadoEm TIMESTAMP
)
```

### Indexes

**Performance Indexes**:
```sql
-- User lookups
CREATE INDEX idx_usuario_email ON Usuario(email);
CREATE INDEX idx_usuario_cpf ON Usuario(cpf);
CREATE INDEX idx_usuario_deletedAt ON Usuario(deletadoEm);

-- Credit queries
CREATE INDEX idx_credito_usuario ON Credito(usuarioId);
CREATE INDEX idx_credito_status ON Credito(status);

-- Project tracking
CREATE INDEX idx_obra_usuario ON Obra(usuarioId);
CREATE INDEX idx_obra_status ON Obra(status);
CREATE INDEX idx_obra_geo ON Obra(geoLatitude, geoLongitude);

-- Evidence validation
CREATE INDEX idx_evidencia_validada ON EvidenciaEtapa(validada);
CREATE INDEX idx_evidencia_data ON EvidenciaEtapa(validada, criadoEm);

-- Fast searches
CREATE INDEX idx_liberacao_status ON LiberacaoParcela(status);
CREATE INDEX idx_kyc_status ON KycDocumento(status);
CREATE INDEX idx_notificacao_usuario ON Notificacao(usuarioId);
```

---

## Application Configuration

### NestJS Module Imports

**Critical Modules** (from `app.module.ts`):

1. **ConfigModule**: Environment variable loading
2. **ThrottlerModule**: Rate limiting
   - General: 100 req/min
   - Auth: 10 req/min
   - Upload: 5 req/min
3. **CacheModule**: Redis integration
   - TTL: 300 seconds (5 min)
4. **BullModule**: Job queue management
   - Queue: `liberacao` (payment releases)
   - Queue: `score-update` (score calculations)
5. **PrismaModule**: Database ORM
6. **AuthModule**: JWT authentication
7. **AnalyticsModule**: Event tracking

### Environment Variable Requirements

**Required** (API won't start without):
```bash
NODE_ENV=staging
PORT=4000
DATABASE_URL=postgresql://...
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...
JWT_SECRET=... (min 64 chars)
ENCRYPTION_KEY=... (32 bytes)
```

**Optional** (features disabled if missing):
```bash
AWS_S3_BUCKET=...        # S3 photo storage
FIREBASE_PROJECT_ID=...  # Push notifications
SMTP_HOST=...            # Email service
SENTRY_DSN=...           # Error tracking
```

---

## Performance Tuning

### PostgreSQL Query Optimization

**For Obra (project) queries with GPS filtering**:

```sql
-- Use PostGIS for distance calculations
CREATE EXTENSION postgis;

-- Distance index for geo queries
CREATE INDEX idx_obra_geo_gist 
ON Obra USING GIST (
  ll_to_earth(geoLatitude, geoLongitude)
);
```

**Query example**:
```sql
SELECT * FROM Obra 
WHERE earth_distance(
  ll_to_earth(geoLatitude, geoLongitude),
  ll_to_earth($1, $2)
) < 50 * 1609.34;  -- 50 meters in feet
```

### Redis Memory Management

**Default TTL**: 300 seconds (5 minutes)

**Custom TTLs**:
- Auth tokens: 3600 seconds (1 hour)
- Cache: 300 seconds (5 minutes)
- Temporary data: 60 seconds

**Memory limits by instance type**:
- Starter: 256MB
- Standard: 512MB - 5GB
- Premium: 5GB+

**Eviction policy**: `allkeys-lru` - evicts least recently used keys when max memory reached

### Connection Pool Sizing

**PostgreSQL** (Prisma):
- Default max: 25 connections
- Per-instance calculation: `(RAM / 10) / 4`
- For 256MB: ~6 connections (conservative)

**Redis**:
- Cluster clients: ~10-20 concurrent connections
- Memory per connection: ~100-200 bytes

---

## Monitoring Metrics

### Key PostgreSQL Metrics

| Metric | Alert Threshold | Interpretation |
|--------|-----------------|-----------------|
| Connections | > 80% of max | Connection pool pressure |
| Database Size | > 80% of storage | Need cleanup or upgrade |
| CPU Usage | > 80% sustained | Query optimization needed |
| Disk Usage | > 90% | Critical - upgrade immediately |
| Replication Lag | > 1 second | Replication issues |
| Slow Queries | Any > 1 second | Indexing needed |

### Key Redis Metrics

| Metric | Alert Threshold | Interpretation |
|--------|-----------------|-----------------|
| Memory Used | > 75% of max | Eviction will begin |
| Evicted Keys | > 10/min | Cache thrashing |
| Connected Clients | > 100 | Connection leak |
| Hit Rate | < 80% | Cache efficiency issue |
| Keyspace DB0 | Growing | Memory accumulation |

### API Metrics

| Metric | Alert Threshold | Tool |
|--------|-----------------|------|
| Uptime | < 99.5% | Render monitoring |
| Error Rate | > 1% | Sentry / Application logs |
| Response Time (p95) | > 1000ms | Application metrics |
| Database Latency | > 500ms | New Relic / DataDog |
| Redis Latency | > 100ms | New Relic / DataDog |

---

## Backup & Disaster Recovery

### Automated Backups (Render PostgreSQL)

```yaml
Backup Schedule: Daily (00:00 UTC)
Retention Period: 7 days (Standard tier)
Backup Type: Full database dump
Restore Time: ~5 minutes
Location: Render infrastructure
```

### Manual Backup Procedure

```bash
# Full database backup (compressed)
pg_dump \
  postgresql://user:pass@host:5432/imobi_staging \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Size estimation
du -sh backup_*.sql.gz

# Upload to S3 for long-term storage
aws s3 cp backup_*.sql.gz s3://imobi-backups/staging/
```

### Restore Procedure

```bash
# From compressed backup
gunzip < backup_20260602_120000.sql.gz | \
  psql postgresql://user:pass@host:5432/imobi_staging

# Time to restore: ~2 minutes for 500MB database
```

### Data Validation After Restore

```sql
-- Verify tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify record counts
SELECT 
  'Usuario' as table_name, COUNT(*) FROM Usuario
UNION ALL
SELECT 'Credito', COUNT(*) FROM Credito
UNION ALL
SELECT 'Obra', COUNT(*) FROM Obra;

-- Check for data corruption
SELECT COUNT(*) FROM Usuario WHERE deletadoEm IS NOT NULL;
```

---

## CI/CD Integration (GitHub Actions)

### Pre-deployment Checks

```yaml
# Check DATABASE_URL is set
# Check REDIS_HOST/PORT/PASSWORD are set
# Run pnpm db:generate
# Run TypeScript type check
# Run tests
```

### Render Auto-Deploy

**Configuration**:
1. Service → **"Settings"** → **"Auto-deploy"**
2. Connect GitHub branch (e.g., `staging`)
3. Auto-deploy on push: Enabled
4. Deploy on branch: `staging`

**Build logs**: Accessible in Render dashboard under service → **"Logs"**

---

## Version Constraints

### Language & Runtime

```
Node.js: 18.x or 20.x
pnpm: 8.x or 9.x
TypeScript: 5.x
```

### Core Dependencies

```json
{
  "nestjs": "^10.0.0",
  "prisma": "^5.0.0",
  "@nestjs/bull": "^10.0.0",
  "bull": "^4.0.0",
  "redis": "^4.6.0",
  "pg": "^8.11.0"
}
```

### Database

```
PostgreSQL: 14.9+ (tested)
Redis: 7.0+ (tested)
Prisma: 5.0+
```

---

## Cost Estimation (Staging)

### PostgreSQL
- Standard Instance: ~$15-25/month
- Storage: $0.10/GB/month
- Backup storage: Included

### Redis
- Standard 256MB: ~$10/month
- Standard 512MB: ~$15/month
- Growth as needed

### Bandwidth
- Inbound: Free
- Outbound: ~$0.10/GB (monitor usage)

### Total Estimated: $30-50/month for staging

---

## Render Service Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Build time | 30 minutes | Increase available |
| Concurrent builds | 1 per service | Queue others |
| Disk space | Service-dependent | Auto-scales |
| Memory | Instance-dependent | Upgrade as needed |
| Network | Unlimited | Pay for egress |

---

## Support & Documentation

- **Render Docs**: https://render.com/docs
- **Prisma**: https://www.prisma.io/docs/
- **PostgreSQL**: https://www.postgresql.org/docs/14/
- **Redis**: https://redis.io/docs/
- **NestJS**: https://docs.nestjs.com/

---

**Last Updated**: 2026-06-02  
**Version**: 1.0  
**For**: imobi Staging Environment
