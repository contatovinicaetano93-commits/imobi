# Runbooks - Imbobi On-Call Operations

**Objetivo**: Procedimentos rápidos para resolução de alertas em produção  
**Versão**: 1.0  
**Atualizado**: 2026-05-27

---

## 1. P0 - Database Connection Pool Exhausted

### Severity: CRITICAL
**SLA Impact**: SLA breach (immediate)  
**Escalation**: PagerDuty + Engineering Lead

### Detection

Alert triggers quando:
- `db.connection_pool.queued > 10` por 1 minuto
- Novas conexões sendo rejeitadas
- Users recebem connection timeout errors

### Diagnosis (Próximos 30 segundos)

```bash
# 1. Confirmar no Datadog
https://app.datadoghq.com/monitors
# Look for: "Database Connection Pool Exhausted"

# 2. SSH na instância (se possível)
ssh prod-api-1.imbobi.io

# 3. Verificar Prisma pool status
docker exec imbobi_api curl -s http://localhost:3000/health | jq .db

# Output esperado:
{
  "pool": {
    "size": 20,
    "available": 2,
    "queued": 15,
    "idle": 0
  }
}

# 4. Verificar PG connections
docker exec imbobi_postgres psql -U postgres -d imbobi -c "SELECT count(*) FROM pg_stat_activity;"
# Se retornar ~20, pool está full

# 5. Verificar long-running queries
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT pid, usename, application_name, state, query_start, query 
  FROM pg_stat_activity 
  WHERE state != 'idle' 
  ORDER BY query_start ASC 
  LIMIT 10;"
```

### Immediate Actions (Próximos 5 minutos)

#### Option A: Terminate Idle Connections (SAFE)

```bash
# Listar todas as conexões
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT pid, usename, application_name, state, state_change, query 
  FROM pg_stat_activity 
  WHERE database = 'imbobi' 
  ORDER BY state_change DESC;"

# Terminar conexões IDLE (não em transação)
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT pg_terminate_backend(pg_stat_activity.pid)
  FROM pg_stat_activity
  WHERE pg_stat_activity.datname = 'imbobi'
  AND pid <> pg_backend_pid()
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';"

# Verificar se liberou conexões
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT count(*) FROM pg_stat_activity WHERE datname = 'imbobi';"
```

#### Option B: Cancel Long-Running Queries (RISKY - pode break)

```bash
# Listar queries por duração
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT pid, usename, state, EXTRACT(EPOCH FROM (NOW() - query_start)) as duration_secs, query 
  FROM pg_stat_activity 
  WHERE datname = 'imbobi' 
  AND state != 'idle' 
  ORDER BY query_start ASC;"

# Cancelar query específica (menos destrutivo)
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT pg_cancel_backend(PID_AQUI);"

# Se não funcionar, terminar (FORCE):
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT pg_terminate_backend(PID_AQUI);"
```

### Recovery Actions (Próximos 10 minutos)

#### Option 1: Increase Connection Pool (Temporary Scale)

```bash
# Aumentar pool size em Prisma (services/api/.env)
DATABASE_POOL_SIZE=30  # Default: 20

# Restart API
docker-compose restart api

# Monitor
docker logs -f imbobi_api | grep -i "pool\|connection"
```

#### Option 2: Scale Horizontally (Read Replicas)

```bash
# Se há read replicas, redirecionar leitura
# Update connection string para read replica

# Criar read replica (AWS RDS/GCP CloudSQL)
# Aguardar ~10 minutos para replicação

# Update read pool em .env
DATABASE_READ_REPLICA_URL=postgresql://...
```

#### Option 3: Temporary Traffic Diversion

```bash
# Se problema persiste, direcionar tráfego para canário (low-traffic) server
# 1. Atualizar load balancer (remove prod-api-1)
# 2. Health check será falhar, AWS ALB auto-removes

# Check ALB status
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --region us-east-1
```

### Post-Incident (Próximas 24 horas)

```bash
# 1. RCA
- Qual query causou timeout?
- Qual aplicação/usuário?
- Por quanto tempo?

# 2. Preventive measures
- Add query optimization
- Increase pool size permanently
- Add monitoring para query duration
- Timeout em queries >30s

# 3. Update documentation
# Add to MONITORING_PLAN.md

# 4. Alert threshold review
# Ajustar threshold de alert se false positives
```

---

## 2. P0 - Database Connection Failures

### Severity: CRITICAL
**SLA Impact**: Immediate SLA breach  
**Escalation**: PagerDuty + DBA

### Detection

Alert triggers quando:
- Qualquer erro de conexão ao database
- Network timeout
- AUTH failure

### Diagnosis (30 segundos)

```bash
# 1. Confirmar conexão
docker exec imbobi_api curl -s http://localhost:3000/health | jq .database

# 2. Check database status
docker ps | grep postgres

# 3. Test connectivity diretamente
docker exec imbobi_api psql "postgresql://user:pass@postgres:5432/imbobi" -c "SELECT 1;"

# 4. Check logs
docker logs imbobi_api | grep -i "connection\|error" | tail -20
docker logs imbobi_postgres | tail -50
```

### Immediate Actions (5 minutos)

#### Network Connectivity

```bash
# Check network reachability
docker exec imbobi_api ping postgres

# Check DNS
docker exec imbobi_api nslookup postgres

# Check port
docker exec imbobi_api nc -zv postgres 5432

# Check credentials
echo $DATABASE_URL  # No logs!
# Verify in password manager
```

#### Restart Database

```bash
# ONLY IF network is good and creds are right
docker-compose stop postgres
docker-compose start postgres

# Wait for startup
sleep 10

# Verify
docker logs postgres | grep "ready to accept"
```

#### Check AWS RDS (if using)

```bash
# AWS Console
https://console.aws.amazon.com/rds/

# Or CLI
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod-db \
  --region us-east-1

# Check status: available, backing-up, rebooting, etc
```

### Recovery (10-30 minutos)

#### Option A: Failover to Read Replica

```bash
# If primary is down
aws rds promote-read-replica \
  --db-instance-identifier imbobi-prod-db-replica-1 \
  --region us-east-1

# Wait for promotion (5-10 minutes)
# Then failover DNS to new primary
```

#### Option B: Restore from Backup

```bash
# Last resort - restore from most recent backup
# This causes data loss since last backup

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-prod-db-restored \
  --db-snapshot-identifier imbobi-prod-db-snapshot-2026-05-27-03-00 \
  --region us-east-1

# Wait for restoration (30-60 minutes)
# Point DNS to new instance
```

### Post-Incident

- Document root cause (power failure? network issue? hung process?)
- Add monitoring para database process
- Implement healthchecks
- Review backup strategy

---

## 3. P0 - Disk Space Critical (<10%)

### Severity: CRITICAL
**SLA Impact**: Service crash (diskfull)  
**Escalation**: PagerDuty + Infrastructure

### Detection

Alert: `system.disk.percent > 90` por 5 minutos

### Diagnosis (Imediato)

```bash
# Check disk usage
df -h /

# Output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/nvme0n1p1  100G  92G  8G   92% /

# Find large files
du -sh /*

# Find recent logs
du -sh /var/log/*
du -sh /var/lib/docker/containers/

# Find large databases
du -sh /var/lib/postgresql/data/
```

### Immediate Actions (5-10 minutos)

#### Option A: Clean Logs (SAFE - 5-20GB)

```bash
# Rotate and delete old logs
docker logs imbobi_api --tail 0 &>/dev/null

# Clean log files directly
find /var/log -type f -name "*.log" -mtime +30 -delete

# Clean Docker logs
find /var/lib/docker/containers -type f -name "*.log*" -delete

# Clean temp files
rm -rf /tmp/*
rm -rf /var/tmp/*

# Verify space freed
df -h /
```

#### Option B: Backup and Delete Old Data (MEDIUM - 20-50GB)

```bash
# Database WAL files (PostgreSQL)
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  VACUUM ANALYZE;  -- Clean dead rows
"

# Check if autovacuum is disabled
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SHOW autovacuum;"

# Force VACUUM (can take time)
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  VACUUM FULL;"

# Check transaction log files
du -sh /var/lib/postgresql/data/pg_wal/

# Archive and clean old WALs
# (depends on backup strategy)
```

#### Option C: Archive to S3 and Clean (MEDIUM - 50-100GB)

```bash
# S3 backup de logs
aws s3 sync /var/log/imbobi/ \
  s3://imbobi-logs-archive/$(date +%Y-%m-%d)/ \
  --region us-east-1

# Delete after backup confirmed
rm -rf /var/log/imbobi/*

# Verify sync
aws s3 ls s3://imbobi-logs-archive/$(date +%Y-%m-%d)/
```

### Long-Term Solution (Próximas 24 horas)

```bash
# 1. Scale EBS volume (AWS)
aws ec2 modify-volume \
  --volume-id vol-xxxxxxxx \
  --size 200 \
  --region us-east-1

# 2. Resize filesystem
sudo resize2fs /dev/nvme0n1p1

# 3. Setup log rotation
cat > /etc/logrotate.d/imbobi <<EOF
/var/log/imbobi/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 imbobi imbobi
    sharedscripts
}
EOF

# 4. Implement S3 archival cron
0 2 * * * aws s3 sync /var/log/imbobi/ s3://imbobi-logs-archive/\$(date +%Y-%m-%d)/ && rm -rf /var/log/imbobi/*
```

---

## 4. P1 - High Error Rate (>5%)

### Severity: HIGH (SLA Impact)
**Response Time**: < 5 minutes

### Diagnosis

```bash
# 1. Check Datadog dashboard
# Overview → Error Rate

# 2. Identify affected endpoint
curl -s 'https://api.datadoghq.com/api/v1/query' \
  -H "DD-API-KEY: ${DATADOG_API_KEY}" \
  -d 'query=sum:http.requests.errors{env:production} by {endpoint}'

# 3. Check error types
docker logs imbobi_api | grep -i "error\|exception" | tail -50

# 4. Check recent deployments
git log --oneline -10
```

### Immediate Actions

#### Option A: Rollback Recent Deploy

```bash
# Get current version
docker ps | grep imbobi_api

# Identify problematic version
git log --oneline imbobi_api/latest | head -5

# Rollback
git revert HEAD  # Ou specific commit
docker build -t imbobi_api:latest .
docker-compose up -d api

# Monitor
docker logs -f imbobi_api
```

#### Option B: Scale Horizontally

```bash
# If deploy is fine, scale
docker-compose up -d --scale api=3

# Load balancer will distribute traffic
# Monitor new instances
docker ps | grep imbobi_api

# Gradual scale up
docker-compose up -d --scale api=4
docker-compose up -d --scale api=5
```

#### Option C: Enable Circuit Breaker

```bash
# Temporary: return 503 instead of 500
# Allows users to retry

curl -X POST http://localhost:3000/admin/circuit-breaker \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "threshold": 50}'
```

### Analysis (Next 1 hour)

```bash
# 1. Check recent changes
git log --oneline --all -20

# 2. Compare metrics (before/after deploy)
# Datadog: Latency P95, Cache hit rate, DB connections

# 3. Identify problematic endpoint
# Which route has highest error rate?

# 4. Root cause
# - Database query timeout?
# - External API failure (S3, payment)?
# - Out of memory?
# - Deadlock in code?

# 5. Fix and test
# - Patch code
# - Test locally
# - Deploy to staging
# - Deploy to production
```

---

## 5. P1 - Latency P95 > 500ms

### Severity: HIGH (SLA Impact)
**Response Time**: < 5 minutes

### Diagnosis

```bash
# 1. Identify slow queries
docker logs imbobi_api | grep -i "slow\|latency" | tail -20

# 2. Check database performance
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT query, calls, mean_exec_time 
  FROM pg_stat_statements 
  ORDER BY mean_exec_time DESC 
  LIMIT 10;"

# 3. Check cache hit rate
# Datadog: cache.hit_rate{cache_name:redis}

# 4. Check S3 operations
# Are uploads slow? Check S3 metrics

# 5. Check memory pressure
docker stats imbobi_api | head -5
```

### Immediate Actions

#### Option A: Optimize Database Query

```bash
# Add index to slow query
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  CREATE INDEX CONCURRENTLY idx_obras_user_id ON obras(user_id);
"

# Analyze impact
BEFORE=$(psql ... -t -c "EXPLAIN ANALYZE SELECT ...")
# Deploy index
AFTER=$(psql ... -t -c "EXPLAIN ANALYZE SELECT ...")
# Compare execution plans
```

#### Option B: Warm Up Cache

```bash
# Pre-load frequently accessed data
docker exec imbobi_api curl -X POST \
  http://localhost:3000/admin/cache/warm \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Or manually in Redis
docker exec imbobi_redis redis-cli <<EOF
MGET key1 key2 key3
EOF
```

#### Option C: Scale API Replicas

```bash
# Add more API instances
docker-compose up -d --scale api=3

# Distribute traffic
# Load balancer (AWS ALB) will balance automatically
```

### Long-Term Solutions (24-48 horas)

1. **Add Redis caching** para queries frequentes
2. **Add database indexing** para slow queries
3. **Query optimization** (N+1 problems, unnecessary joins)
4. **CDN** para static content
5. **Asynchronous processing** via BullMQ

---

## 6. P2 - Dead Letter Queue Has Messages

### Severity: MEDIUM
**Business Impact**: Parcelas not being released  
**Response Time**: < 1 hour

### Diagnosis

```bash
# 1. Check DLQ size
docker exec imbobi_api curl -s http://localhost:3000/health | jq .queue.deadLetter

# 2. Check failed job logs
docker logs imbobi_api | grep -i "dead\|failed\|job" | tail -50

# 3. Check Redis DLQ
docker exec imbobi_redis redis-cli \
  LLEN imbobi:queue:liberacao-parcela:failed

# 4. Inspect failed job
docker exec imbobi_redis redis-cli \
  LRANGE imbobi:queue:liberacao-parcela:failed 0 0 | jq .
```

### Recovery

```bash
# 1. Fix root cause
# Why did job fail? (e.g., external API timeout?)

# 2. Manually reprocess DLQ jobs
docker exec imbobi_api npm run jobs:reprocess-dlq \
  --queue=liberacao-parcela \
  --limit=10

# Or via API
curl -X POST http://localhost:3000/admin/queue/reprocess-dlq \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"queue": "liberacao-parcela", "limit": 10}'

# 3. Monitor retry
docker logs -f imbobi_api | grep -i "liberacao\|retry"

# 4. Verify in database
docker exec imbobi_postgres psql -U postgres -d imbobi -c "
  SELECT COUNT(*) FROM parcelas WHERE status = 'pendente_liberacao';"
```

---

## 7. Quick Reference Commands

```bash
# Health Check
docker-compose ps
docker logs imbobi_api --tail 100
docker exec imbobi_api curl http://localhost:3000/health

# Scale
docker-compose up -d --scale api=3

# Restart Service
docker-compose restart api
docker-compose restart postgres

# View Logs
docker logs -f imbobi_api
docker logs -f imbobi_postgres

# Database
docker exec imbobi_postgres psql -U postgres -d imbobi -c "SELECT 1;"

# Redis
docker exec imbobi_redis redis-cli PING
docker exec imbobi_redis redis-cli INFO stats

# Metrics
docker stats

# Rollback
git revert HEAD
docker-compose up -d

# Emergency Stop
docker-compose down
```

---

## 8. Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Eng | [From PagerDuty] | [From PagerDuty] | [From PagerDuty] |
| DBA | Database Team | +55 11 xxxx-xxxx | dba@imbobi.com |
| Infra | DevOps Lead | +55 11 xxxx-xxxx | devops@imbobi.com |
| CTO | CTO | +55 11 xxxx-xxxx | cto@imbobi.com |

---

**Última atualização**: 2026-05-27  
**Próxima revisão**: 2026-08-27
