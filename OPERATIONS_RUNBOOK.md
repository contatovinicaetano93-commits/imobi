# Operations Runbook — Production Support Guide

**Version:** 1.0  
**Last Updated:** 2026-05-31  
**Status:** Ready for Production

---

## 1. Service Health & Monitoring

### 1.1 Quick Health Check
```bash
# API Health
curl -s http://localhost:4000/api/v1/health | jq .

# Database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Redis connectivity
redis-cli -h $REDIS_HOST ping

# Web frontend
curl -s http://localhost:3000 | head -20
```

### 1.2 Continuous Monitoring Script
```bash
#!/bin/bash
while true; do
  API=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/health)
  WEB=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
  
  TIMESTAMP=$(date '+%H:%M:%S')
  echo "[$TIMESTAMP] API: $API | Web: $WEB"
  
  [ "$API" != "200" ] && echo "⚠️  API unhealthy" && alert_ops
  [ "$WEB" != "200" ] && echo "⚠️  Web unhealthy" && alert_ops
  
  sleep 30
done
```

### 1.3 Database Health
```bash
# Check connections
psql $DATABASE_URL << SQL
SELECT datname, count(*) as connections 
FROM pg_stat_activity 
GROUP BY datname;
SQL

# Check table sizes
psql $DATABASE_URL << SQL
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables 
WHERE schemaname != 'pg_catalog' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
SQL

# Check slow queries (require logging)
psql $DATABASE_URL << SQL
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;
SQL
```

### 1.4 Redis Health
```bash
redis-cli -h $REDIS_HOST << REDIS
INFO stats
DBSIZE
CONFIG GET maxmemory
MEMORY STATS
REDIS
```

---

## 2. Common Issues & Resolutions

### Issue: API Server Not Responding
```bash
# Check process
docker ps -a | grep imobi-api

# Check logs
docker logs imobi-api -f --tail=100

# Restart
docker-compose -f docker-compose.staging.yml restart api

# If still failing, check database connectivity
psql $DATABASE_URL -c "SELECT 1;"
```

**Common causes:**
- Database connection timeout (check DATABASE_URL)
- Redis connection failed (check REDIS_HOST/PORT)
- JWT_SECRET invalid (must be >64 chars)
- Encryption key missing (ENCRYPTION_KEY env var)

### Issue: Database Connection Timeout
```bash
# Test connectivity
psql -h $REDIS_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Check max connections
psql $DATABASE_URL -c "SHOW max_connections;"

# Kill idle connections
psql $DATABASE_URL << SQL
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Kill idle connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < now() - interval '10 minutes';
SQL
```

### Issue: Redis Memory Full
```bash
# Check memory usage
redis-cli -h $REDIS_HOST INFO memory

# Clear old cache keys
redis-cli -h $REDIS_HOST EVAL "
  local keys = redis.call('keys', '*')
  for i=1,#keys do
    redis.call('del', keys[i])
  end
  return #keys
" 0

# Or clear specific patterns
redis-cli -h $REDIS_HOST --scan --pattern "user:*" | xargs redis-cli -h $REDIS_HOST DEL
```

### Issue: Rate Limiting Too Strict
**API endpoints have 20 requests per 60 seconds limit**
- Check if legitimate traffic is hitting limits
- Adjust in `src/modules/*/**.controller.ts`: `@Throttle({ default: { limit: 20, ttl: 60000 } })`

### Issue: SSL/HTTPS Certificate Expired
```bash
# Check certificate expiry
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | \
  openssl x509 -noout -dates

# Renew with Let's Encrypt (if using certbot)
sudo certbot renew --dry-run
sudo certbot renew
```

---

## 3. Deployment & Rollback Procedures

### 3.1 Blue-Green Deployment
```bash
#!/bin/bash
# Deploy new version without downtime

# 1. Build new images
docker-compose -f docker-compose.staging.yml build --no-cache

# 2. Start new containers on staging
docker-compose -f docker-compose.staging.yml up -d --scale api=2

# 3. Run smoke tests
./SMOKE_TESTS.sh http://localhost:4000

# 4. If successful, route traffic
# (Update load balancer / nginx upstream)
nginx -s reload

# 5. Stop old containers
docker stop imobi-api-old
docker rm imobi-api-old
```

### 3.2 Rollback Procedure
```bash
#!/bin/bash
# Quick rollback to previous version

# 1. Get previous image
PREV_IMAGE=$(docker images imobi-api | sed -n '2p' | awk '{print $3}')

# 2. Stop current
docker stop imobi-api

# 3. Start previous
docker run -d \
  --name imobi-api-rollback \
  --env-file .env.staging \
  -p 4000:4000 \
  $PREV_IMAGE

# 4. Verify
curl http://localhost:4000/api/v1/health

# 5. If OK, make permanent
docker rename imobi-api-rollback imobi-api
docker-compose -f docker-compose.staging.yml up -d api
```

---

## 4. Backup & Disaster Recovery

### 4.1 Database Backup
```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backup/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Full dump
pg_dump $DATABASE_URL > "$BACKUP_DIR/imobi_full_$TIMESTAMP.sql"

# Compressed
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/imobi_full_$TIMESTAMP.sql.gz"

# Backup metadata
echo "Backup: $TIMESTAMP" > "$BACKUP_DIR/imobi_full_$TIMESTAMP.meta"
echo "Database: imobi" >> "$BACKUP_DIR/imobi_full_$TIMESTAMP.meta"
echo "Size: $(du -h "$BACKUP_DIR/imobi_full_$TIMESTAMP.sql.gz" | cut -f1)" >> "$BACKUP_DIR/imobi_full_$TIMESTAMP.meta"

# Keep last 30 days
find $BACKUP_DIR -name "imobi_*.sql.gz" -mtime +30 -delete

# Upload to S3 (if configured)
aws s3 cp "$BACKUP_DIR/imobi_full_$TIMESTAMP.sql.gz" \
  s3://imobi-backups/postgres/

echo "✓ Backup complete: $TIMESTAMP"
```

### 4.2 Database Restore
```bash
#!/bin/bash
# Restore from backup

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: bash restore.sh <backup_file>"
  exit 1
fi

# List available backups
echo "Available backups:"
ls -lah /backup/postgres/*.sql.gz | head -10

read -p "Enter backup filename to restore: " BACKUP_FILE

# Restore
echo "Restoring from: $BACKUP_FILE"
gunzip -c "/backup/postgres/$BACKUP_FILE" | psql $DATABASE_URL

echo "✓ Restore complete"
```

### 4.3 Redis Backup
```bash
# Redis automatically saves to /data/dump.rdb
# For additional backup:

redis-cli -h $REDIS_HOST BGSAVE
# Creates /data/dump.rdb (background save)

# Or synchronous:
redis-cli -h $REDIS_HOST SAVE

# List snapshots
ls -lah /var/lib/redis/dump.rdb
```

---

## 5. Performance Tuning

### 5.1 Database Query Optimization
```bash
# Enable slow query logging
psql $DATABASE_URL << SQL
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
SQL

# Check execution plans
EXPLAIN ANALYZE SELECT * FROM usuario WHERE email = 'test@example.com';

# Create missing indexes
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_etapa_status_data ON etapa(status, criadoEm);
CREATE INDEX idx_kyc_usuario ON kyc(usuarioId);
```

### 5.2 Redis Cache Optimization
```bash
# Check memory usage by key pattern
redis-cli -h $REDIS_HOST --bigkeys

# Monitor commands in real-time
redis-cli -h $REDIS_HOST MONITOR

# Set eviction policy if memory full
redis-cli -h $REDIS_HOST CONFIG SET maxmemory-policy allkeys-lru
```

### 5.3 API Request Optimization
```bash
# Profile with curl timing
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/api/v1/obras

# Benchmark with ab (Apache Bench)
ab -n 1000 -c 10 http://localhost:4000/api/v1/health

# Load test with k6
k6 run k6-load-test.js --vus 50 --duration 2m
```

---

## 6. Security Monitoring

### 6.1 Check Security Headers
```bash
curl -i http://localhost:4000/api/v1/health | grep -i "^[a-z-]*:"
# Should include:
# - Strict-Transport-Security
# - Content-Security-Policy
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
```

### 6.2 Monitor Failed Authentication
```bash
# Check API logs for failed login attempts
docker logs imobi-api | grep -i "unauthorized\|forbidden"

# Count by IP
docker logs imobi-api | grep "unauthorized" | awk -F',' '{print $1}' | sort | uniq -c | sort -rn
```

### 6.3 Validate Encryption
```bash
# Check if refresh tokens are encrypted
redis-cli -h $REDIS_HOST KEYS "sessao:*" | head -1 | xargs redis-cli -h $REDIS_HOST GET
# Should see encrypted/binary data, not plaintext token
```

---

## 7. Incident Response

### 7.1 When Service is Down
1. **Acknowledge:** Log incident in tracking system
2. **Assess:** Run health checks (Section 1.1)
3. **Isolate:** Check which component failed (API/Web/DB/Redis)
4. **Recover:** Follow relevant resolution in Section 2
5. **Communicate:** Update status page
6. **Document:** Record root cause and timeline

### 7.2 Data Loss Prevention
```bash
# Real-time backup to S3
while true; do
  pg_dump $DATABASE_URL | gzip | \
    aws s3 cp - "s3://imobi-backups/postgres/incremental-$(date +%s).sql.gz"
  sleep 3600  # Every hour
done

# Redis persistence
# Already enabled in docker-compose.yml with appendonly yes
```

### 7.3 Escalation Procedure
```
Level 1: Ops team (pagerduty notification)
Level 2: Database administrator (if DB issue > 5 min)
Level 3: Architecture team (if multiple systems affected)
Level 4: Executive escalation (if customer-facing > 15 min)
```

---

## 8. Logging & Audit Trail

### 8.1 Centralized Logging
```bash
# Docker logs aggregation
docker-compose -f docker-compose.staging.yml logs -f api web postgres redis

# Or with timestamps
docker-compose -f docker-compose.staging.yml logs --timestamps -f

# Save logs to file
docker-compose -f docker-compose.staging.yml logs > logs/$(date +%Y%m%d_%H%M%S).log
```

### 8.2 Audit Important Events
```sql
-- Log user actions (to be implemented)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL,
  acao VARCHAR(50) NOT NULL,
  recurso VARCHAR(100),
  detalhes JSONB,
  ip_address INET,
  criado_em TIMESTAMP DEFAULT now()
);

-- Example: Log all approvals
CREATE TRIGGER log_approval
AFTER UPDATE ON etapa
FOR EACH ROW
WHEN (NEW.status = 'APROVADA' AND OLD.status != 'APROVADA')
EXECUTE FUNCTION log_audit_event('etapa_approved');
```

---

## 9. Scheduled Maintenance

### 9.1 Daily Tasks
- [ ] Check service health (automated)
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Check disk space

### 9.2 Weekly Tasks
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Review performance metrics
- [ ] Test backup restore procedure
- [ ] Security audit logs

### 9.3 Monthly Tasks
- [ ] Full disaster recovery drill
- [ ] Update dependencies (if needed)
- [ ] Review and adjust resource allocation
- [ ] Capacity planning

### 9.4 Quarterly Tasks
- [ ] Security penetration test
- [ ] Load testing validation
- [ ] Documentation review/update
- [ ] Architecture review

---

## 10. Emergency Contacts

| Role | Contact | On-Call |
|------|---------|---------|
| Lead DevOps | devops@example.com | PagerDuty |
| Database Admin | dba@example.com | PagerDuty |
| Security Officer | security@example.com | As needed |
| On-Call Schedule | https://pagerduty.example.com | - |

---

## Quick Reference Commands

```bash
# View logs
docker-compose -f docker-compose.staging.yml logs -f api

# Restart service
docker-compose -f docker-compose.staging.yml restart api

# SSH into container
docker exec -it imobi-api bash

# Database shell
docker-compose -f docker-compose.staging.yml exec postgres psql -U imobi_user -d imobi

# Redis CLI
docker-compose -f docker-compose.staging.yml exec redis redis-cli

# Stop all services
docker-compose -f docker-compose.staging.yml down

# Full reset (WARNING: Data loss!)
docker-compose -f docker-compose.staging.yml down -v
```

---

**Last reviewed:** 2026-05-31  
**Next review:** 2026-06-30  
**Status:** Ready for production use
