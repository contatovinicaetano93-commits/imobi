# Data Migration Checklist — imobi MVP (Dev → Staging → Production)

**Last Updated:** 2026-05-31  
**Document Version:** 2.0  
**Status:** Production-Ready  
**Go-Live:** 2026-06-02 (02:00-04:00 UTC)

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Development → Staging Migration](#development--staging-migration)
3. [Staging → Production Migration](#staging--production-migration)
4. [Data Anonymization & PII Protection](#data-anonymization--pii-protection)
5. [Evidence Files Migration](#evidence-files-migration)
6. [LGPD Compliance Verification](#lgpd-compliance-verification)
7. [Post-Migration Validation](#post-migration-validation)

---

## Pre-Migration Checklist

### Phase 1: Pre-Flight (48 hours before migration)

- [ ] Create full backup of source database (dev/staging)
  ```bash
  pg_dump -h $SOURCE_HOST -U imbobi -d imbobi_dev -F custom > /tmp/pre-migration-backup.sql
  ```

- [ ] Verify all data anonymization queries are ready
  ```bash
  # Scripts should exist:
  ls -la /scripts/anonymize-*.sql
  ```

- [ ] Run anonymization scripts on test database
  ```bash
  # Test on staging first
  psql -h staging.db.com -U imbobi -d imbobi_staging < /scripts/anonymize-pii.sql
  ```

- [ ] Prepare rollback plan
  - [ ] Document pre-migration backup location
  - [ ] Identify rollback timeframe (e.g., within 2 hours)
  - [ ] Test rollback procedure on staging

- [ ] Notify all team members
  - [ ] Post #infrastructure Slack message
  - [ ] Send email to team with migration schedule
  - [ ] Confirm no concurrent deployments scheduled

- [ ] Verify S3 bucket sync config
  ```bash
  # Evidence files sync settings
  cat /scripts/sync-s3-config.json
  ```

- [ ] Check disk space on all systems
  ```bash
  df -h /var/lib/postgresql
  df -h /var/lib/redis
  df -h /mnt/s3-cache
  ```

---

## Development → Staging Migration

### Timing: Optional (for testing only)

**Note:** Dev database contains test data and should NOT directly migrate to production.

### Migration Steps

```bash
#!/bin/bash
# /scripts/migrate-dev-to-staging.sh

set -e
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
LOG_FILE="/var/log/migration-dev-staging-${TIMESTAMP}.log"

exec > >(tee "$LOG_FILE")
exec 2>&1

echo "=== DEV → STAGING MIGRATION ==="
echo "Start time: $(date)"

# Step 1: Backup staging (safety)
echo ""
echo "STEP 1: Backing up current staging database..."
pg_dump -h staging.db.railway.internal \
  -U imbobi \
  -d imbobi_staging \
  -F custom > /tmp/staging-backup-pre-migration.sql

# Step 2: Create dump from dev
echo ""
echo "STEP 2: Exporting dev database..."
pg_dump -h dev.db.railway.internal \
  -U imbobi \
  -d imbobi_dev \
  -F custom \
  --no-password > /tmp/imbobi-dev-export-${TIMESTAMP}.sql

echo "Dump size: $(du -h /tmp/imbobi-dev-export-${TIMESTAMP}.sql)"

# Step 3: Anonymize exported data (CRITICAL)
echo ""
echo "STEP 3: Anonymizing PII before staging import..."
psql -h localhost -U postgres -d imbobi_staging << 'SQL'
-- Remove all test/development users
DELETE FROM usuarios WHERE email LIKE '%@test.%' OR email LIKE '%dev%';

-- Anonymize production-like data
UPDATE usuarios SET
  phone = '11999999999',
  cpf_cnpj = '00000000000000'
WHERE status = 'INATIVO';

-- Clear sensitive cache
TRUNCATE TABLE cache_entries CASCADE;
SQL

# Step 4: Drop old staging data
echo ""
echo "STEP 4: Dropping old staging data..."
psql -h staging.db.railway.internal -U imbobi << SQL
DROP DATABASE IF EXISTS imbobi_staging_old;
ALTER DATABASE imbobi_staging RENAME TO imbobi_staging_old;
SQL

# Step 5: Create fresh staging from dev
echo ""
echo "STEP 5: Restoring anonymized dev data to staging..."
createdb -h staging.db.railway.internal -U imbobi imbobi_staging

gunzip -c /tmp/imbobi-dev-export-${TIMESTAMP}.sql | \
  pg_restore -h staging.db.railway.internal \
  -U imbobi \
  -d imbobi_staging \
  --verbose

# Step 6: Post-restore anonymization
echo ""
echo "STEP 6: Running additional anonymization on staging..."
psql -h staging.db.railway.internal -U imbobi -d imbobi_staging \
  < /scripts/anonymize-staging.sql

# Step 7: Verify
echo ""
echo "STEP 7: Verifying migration..."
psql -h staging.db.railway.internal -U imbobi -d imbobi_staging << SQL
SELECT COUNT(*) as total_users FROM usuarios;
SELECT COUNT(*) as total_obras FROM obras;
SELECT COUNT(*) as total_parcelas FROM parcelas;
SQL

echo ""
echo "=== DEV → STAGING MIGRATION COMPLETE ==="
echo "Status: ✓ SUCCESS"
```

**Execution:**
```bash
bash /scripts/migrate-dev-to-staging.sh
```

---

## Staging → Production Migration

### Timeline: 2026-06-02, 02:00-04:00 UTC

**Maintenance Window:** 2 hours  
**Expected Downtime:** 30-45 minutes (database restore phase)

### Pre-Production Checklist (24 hours before)

- [ ] All anonymization scripts tested on staging
- [ ] Evidence files sync tested
- [ ] DNS failover route prepared
- [ ] Rollback database backup created
- [ ] Team notified of maintenance window
- [ ] Sentry integration verified
- [ ] CloudWatch alerts tested

### Production Migration Procedure

```bash
#!/bin/bash
# /scripts/migrate-staging-to-production.sh
# CRITICAL: Run only during authorized maintenance window

set -e
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
LOG_FILE="/var/log/migration-staging-prod-${TIMESTAMP}.log"

exec > >(tee "$LOG_FILE")
exec 2>&1

echo "============================================"
echo "  STAGING → PRODUCTION MIGRATION"
echo "  Started: $(date)"
echo "  Maintenance Window: 02:00-04:00 UTC"
echo "============================================"
echo ""

# STEP 1: Pre-migration verification (5 min)
echo "[02:00] STEP 1: Pre-migration verification..."

# Verify connectivity
if ! psql -h prod.db.railway.internal -U imbobi -d imbobi_prod -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✗ Cannot connect to production database"
  exit 1
fi

echo "✓ Production database accessible"

# Check staging data integrity
STAGING_OBRAS=$(psql -h staging.db.railway.internal -U imbobi -d imbobi_staging \
  -t -c "SELECT COUNT(*) FROM obras;")
STAGING_USERS=$(psql -h staging.db.railway.internal -U imbobi -d imbobi_staging \
  -t -c "SELECT COUNT(*) FROM usuarios;")

echo "✓ Staging data ready: $STAGING_OBRAS obras, $STAGING_USERS usuarios"

# STEP 2: Create production backup (10 min)
echo ""
echo "[02:05] STEP 2: Creating pre-migration backup of production..."

pg_dump -h prod.db.railway.internal \
  -U imbobi \
  -d imbobi_prod \
  -F custom \
  > "/tmp/prod-backup-pre-migration-${TIMESTAMP}.sql"

# Upload backup to S3 (safety copy)
gzip "/tmp/prod-backup-pre-migration-${TIMESTAMP}.sql"
aws s3 cp "/tmp/prod-backup-pre-migration-${TIMESTAMP}.sql.gz" \
  "s3://imbobi-database-backups/migration-backups/" \
  --region us-east-1

echo "✓ Production backup created and uploaded to S3"

# STEP 3: Enable maintenance mode (1 min)
echo ""
echo "[02:15] STEP 3: Enabling maintenance mode..."

# Stop API service gracefully
systemctl stop imobi-api || true
sleep 5

# Update DNS to show maintenance page
# (Alternative: return 503 Service Unavailable from web server)

echo "✓ API service stopped"

# STEP 4: Final staging validation (5 min)
echo ""
echo "[02:16] STEP 4: Final validation before cutover..."

psql -h staging.db.railway.internal -U imbobi -d imbobi_staging << SQL
-- Verify no NULL critical fields
SELECT COUNT(*) AS null_obras_location FROM obras WHERE location IS NULL;
SELECT COUNT(*) AS null_parcelas_geom FROM parcelas WHERE geom IS NULL;

-- Verify foreign key integrity
SELECT COUNT(*) AS orphan_parcelas FROM parcelas p
  WHERE NOT EXISTS (SELECT 1 FROM obras o WHERE o.id = p.obra_id);

-- Verify no test data remains
SELECT COUNT(*) AS test_users FROM usuarios 
  WHERE email LIKE '%@test.%' OR email LIKE '%example.%';
SQL

echo "✓ Data validation passed"

# STEP 5: Drop old production data (2 min)
echo ""
echo "[02:21] STEP 5: Dropping old production database..."

psql -h prod.db.railway.internal -U postgres << SQL
-- Terminate all connections to production database
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE datname = 'imbobi_prod' AND pid <> pg_backend_pid();

-- Rename old database for safety
ALTER DATABASE imbobi_prod RENAME TO imbobi_prod_backup_${TIMESTAMP};
SQL

echo "✓ Old production database renamed for safety"

# STEP 6: Create fresh production database (2 min)
echo ""
echo "[02:23] STEP 6: Creating fresh production database..."

createdb -h prod.db.railway.internal -U imbobi imbobi_prod

echo "✓ Production database created"

# STEP 7: Export staging dump (5 min)
echo ""
echo "[02:25] STEP 7: Creating staging export..."

pg_dump -h staging.db.railway.internal \
  -U imbobi \
  -d imbobi_staging \
  -F custom \
  > "/tmp/staging-export-migration-${TIMESTAMP}.sql"

echo "Dump size: $(du -h /tmp/staging-export-migration-${TIMESTAMP}.sql)"

# STEP 8: Restore to production (15-20 min - LONGEST STEP)
echo ""
echo "[02:30] STEP 8: Restoring staging data to production..."
echo "⏱ This step may take 10-15 minutes - please wait..."

pg_restore -h prod.db.railway.internal \
  -U imbobi \
  -d imbobi_prod \
  -j 4 \
  --verbose \
  "/tmp/staging-export-migration-${TIMESTAMP}.sql" 2>&1 | tail -20

echo "✓ Data restored to production"

# STEP 9: Post-restore optimization (5 min)
echo ""
echo "[02:45] STEP 9: Post-restore optimization..."

psql -h prod.db.railway.internal -U imbobi -d imbobi_prod << SQL
VACUUM ANALYZE;
REINDEX INDEX CONCURRENTLY idx_obras_location;
SQL

echo "✓ Database optimized"

# STEP 10: Verify production data (5 min)
echo ""
echo "[02:50] STEP 10: Verifying production data..."

PROD_OBRAS=$(psql -h prod.db.railway.internal -U imbobi -d imbobi_prod \
  -t -c "SELECT COUNT(*) FROM obras;")
PROD_USERS=$(psql -h prod.db.railway.internal -U imbobi -d imbobi_prod \
  -t -c "SELECT COUNT(*) FROM usuarios;")

echo "Production now contains: $PROD_OBRAS obras, $PROD_USERS usuarios"
echo "Staging contained: $STAGING_OBRAS obras, $STAGING_USERS usuarios"

if [ "$PROD_OBRAS" != "$STAGING_OBRAS" ] || [ "$PROD_USERS" != "$STAGING_USERS" ]; then
  echo "✗ WARNING: Data counts don't match!"
  echo "Manual verification required"
fi

# STEP 11: Bring API back online (5 min)
echo ""
echo "[02:55] STEP 11: Restarting API service..."

systemctl start imobi-api
sleep 10

# Verify API health
if curl -s http://localhost:3000/health | jq -e '.status == "healthy"' > /dev/null; then
  echo "✓ API service healthy"
else
  echo "✗ API health check failed - investigate logs"
fi

# STEP 12: Remove maintenance mode (1 min)
echo ""
echo "[03:00] STEP 12: Disabling maintenance mode..."

# Update DNS back to normal
systemctl reload nginx || true

echo "✓ Service back online"

# STEP 13: Cleanup (3 min)
echo ""
echo "[03:05] STEP 13: Cleanup..."

rm -f "/tmp/staging-export-migration-${TIMESTAMP}.sql"
rm -f "/tmp/prod-backup-pre-migration-${TIMESTAMP}.sql.gz"

echo "✓ Temporary files cleaned up"

# STEP 14: Final verification (10 min)
echo ""
echo "[03:08] STEP 14: Final smoke tests..."

# Test API endpoints
curl -s https://api.imobi.app/health | jq '.'
curl -s https://api.imobi.app/api/obras?limit=1 | jq '.data | length'

echo ""
echo "============================================"
echo "  ✓ MIGRATION COMPLETE"
echo "  Finished: $(date)"
echo "  Total Duration: ~60 minutes"
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo "1. Monitor error logs for 30 minutes"
echo "2. Run smoke tests: curl https://api.imobi.app/health"
echo "3. Check database query performance"
echo "4. Archive migration log: $LOG_FILE"
echo "5. Clean up old prod backup after 48-hour observation period"
```

**Execution (during maintenance window):**
```bash
sudo bash /scripts/migrate-staging-to-production.sh 2>&1 | tee /var/log/migration.log
```

---

## Data Anonymization & PII Protection

### Anonymization Scripts

#### `/scripts/anonymize-pii.sql`

```sql
-- Remove all test/development users before production
DELETE FROM usuarios 
WHERE 
  email LIKE '%@test.%' 
  OR email LIKE '%@example.%'
  OR email LIKE '%dev%'
  OR status = 'TEST';

-- Anonymize inactive user PII
UPDATE usuarios SET
  phone = NULL,
  cpf_cnpj = '00000000000000',
  updated_at = NOW()
WHERE status = 'INATIVO';

-- Anonymize address data for privacy
UPDATE obras SET
  address_street = 'REDACTED',
  address_number = '0',
  address_complement = NULL,
  updated_at = NOW()
WHERE status = 'ARQUIVADO' AND created_at < CURRENT_DATE - INTERVAL '30 days';

-- Remove temporary/test data
DELETE FROM atividades 
WHERE description LIKE '%test%' OR description LIKE '%dev%';

-- Clear sensitive file logs
DELETE FROM evidencias 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
  AND (file_path LIKE '%test%' OR file_path LIKE '%temp%');

-- Verify anonymization
SELECT COUNT(*) as remaining_test_users FROM usuarios 
WHERE email LIKE '%@test.%' OR email LIKE '%@example.%';
```

#### `/scripts/validate-anonymization.sql`

```sql
-- Verify no production users have been anonymized
SELECT 'FAIL' as status, 'Production users anonymized' as error
FROM usuarios 
WHERE phone IS NULL AND status = 'ATIVO'
LIMIT 1;

-- Verify no test users remain
SELECT 'FAIL' as status, 'Test users remain' as error
FROM usuarios 
WHERE email LIKE '%@test.%' OR email LIKE '%@example.%'
LIMIT 1;

-- Verify critical data not removed
SELECT 'FAIL' as status, 'Missing obra data' as error
FROM obras
WHERE id IS NULL OR location IS NULL
LIMIT 1;

-- If we get here, no SELECT results = success
SELECT 'SUCCESS' as status, 'All anonymization checks passed' as message;
```

---

## Evidence Files Migration

### S3 Sync Configuration

```bash
#!/bin/bash
# /scripts/migrate-s3-evidence.sh

set -e
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)

echo "=== S3 EVIDENCE FILES MIGRATION ==="
echo "Source: staging bucket"
echo "Destination: production bucket"
echo ""

# Step 1: Count files in source
echo "STEP 1: Counting source files..."
SOURCE_COUNT=$(aws s3 ls s3://imbobi-evidence-staging/ --recursive | wc -l)
echo "Files in staging: $SOURCE_COUNT"

# Step 2: Create sync manifest
echo ""
echo "STEP 2: Creating integrity manifest..."
aws s3 ls s3://imbobi-evidence-staging/ --recursive | awk '{print $NF}' \
  > "/tmp/migration-manifest-${TIMESTAMP}.txt"

# Step 3: Sync to production (with verification)
echo ""
echo "STEP 3: Syncing files to production..."
aws s3 sync \
  s3://imbobi-evidence-staging/ \
  s3://imbobi-evidence-prod/ \
  --region us-east-1 \
  --sse AES256 \
  --storage-class STANDARD_IA \
  --no-progress

# Step 4: Verify sync
echo ""
echo "STEP 4: Verifying sync integrity..."
DEST_COUNT=$(aws s3 ls s3://imbobi-evidence-prod/ --recursive | wc -l)

if [ "$SOURCE_COUNT" -eq "$DEST_COUNT" ]; then
  echo "✓ Sync verified: $DEST_COUNT files migrated"
else
  echo "✗ Sync mismatch: source=$SOURCE_COUNT, dest=$DEST_COUNT"
  exit 1
fi

# Step 5: Test random file access
echo ""
echo "STEP 5: Testing file access..."
SAMPLE_FILE=$(aws s3 ls s3://imbobi-evidence-prod/ --recursive | head -1 | awk '{print $NF}')

if aws s3 head-object --bucket imbobi-evidence-prod --key "$SAMPLE_FILE" > /dev/null 2>&1; then
  echo "✓ File access verified: $SAMPLE_FILE"
else
  echo "✗ File access failed"
  exit 1
fi

echo ""
echo "=== S3 MIGRATION COMPLETE ==="
```

**Integrity Validation:**
```bash
#!/bin/bash
# /scripts/validate-s3-migration.sh

# Compare file lists
aws s3 ls s3://imbobi-evidence-staging/ --recursive | awk '{print $NF}' | sort > /tmp/staging-files.txt
aws s3 ls s3://imbobi-evidence-prod/ --recursive | awk '{print $NF}' | sort > /tmp/prod-files.txt

# Diff
if diff /tmp/staging-files.txt /tmp/prod-files.txt > /dev/null; then
  echo "✓ File lists match perfectly"
else
  echo "✗ File discrepancies found:"
  diff /tmp/staging-files.txt /tmp/prod-files.txt | head -10
fi

# Check S3 encryption
echo ""
echo "Verifying encryption on production bucket:"
aws s3api head-bucket --bucket imbobi-evidence-prod 2>&1 | grep -i "ServerSideEncryption" || echo "✓ Encryption confirmed"
```

---

## LGPD Compliance Verification

### Pre-Migration LGPD Checklist

- [ ] All PII anonymized in non-production environments
- [ ] No production user data exposed in logs
- [ ] S3 evidence files encrypted with AES-256
- [ ] Backup files encrypted at rest
- [ ] Data retention policy documented and enforced
- [ ] User consent verified in database (if required)

### LGPD Validation Queries

```sql
-- 1. Verify no unencrypted backups in S3
-- (Check manually via AWS Console or CLI)
aws s3api head-object --bucket imbobi-database-backups --key "postgres/..." | grep -i ServerSideEncryption

-- 2. Check for sensitive data in logs
SELECT 'FAIL' as status FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'log_events'
    AND EXISTS (SELECT 1 FROM log_events WHERE body LIKE '%cpf%' OR body LIKE '%phone%')
LIMIT 1;

-- 3. Verify GDPR/LGPD user consent tracking
SELECT COUNT(*) as consents_recorded FROM usuarios
  WHERE lgpd_consent_date IS NOT NULL
    AND status = 'ATIVO';

-- 4. Check for default/test passwords (should not exist)
SELECT COUNT(*) as insecure_accounts FROM usuarios
  WHERE password_hash = 'test' OR password_hash = 'demo';
```

### Data Retention Policy

| Data Type | Retention | Deletion Method |
|-----------|-----------|-----------------|
| Active User Accounts | Until account deletion | Manual deletion via admin interface |
| Inactive User Data | 90 days post-deactivation | Auto-delete via scheduled job |
| Evidence Files | Duration of obra + 1 year | Archive to Glacier then delete |
| Backup Files | 30 days rolling | Auto-expire via S3 lifecycle |
| Logs | 90 days | Archive then delete |

---

## Post-Migration Validation

### Immediate Validation (within 30 minutes)

```bash
#!/bin/bash
# /scripts/validate-migration.sh

echo "=== POST-MIGRATION VALIDATION ==="

# 1. Data Counts
echo ""
echo "1. Data counts verification:"
psql -h prod.db.railway.internal -U imbobi -d imbobi_prod << SQL
SELECT 'PASS' as status WHERE 
  (SELECT COUNT(*) FROM obras) > 0
  AND (SELECT COUNT(*) FROM usuarios) > 0
  AND (SELECT COUNT(*) FROM parcelas) > 0;
SQL

# 2. Referential Integrity
echo ""
echo "2. Referential integrity:"
psql -h prod.db.railway.internal -U imbobi -d imbobi_prod << SQL
-- Check for orphaned parcelas
SELECT COUNT(*) as orphan_count FROM parcelas
  WHERE NOT EXISTS (SELECT 1 FROM obras WHERE obras.id = parcelas.obra_id);
SQL

# 3. GIS Data Validation
echo ""
echo "3. GIS validation:"
psql -h prod.db.railway.internal -U imbobi -d imbobi_prod << SQL
SELECT COUNT(*) as invalid_geom FROM parcelas WHERE NOT ST_IsValid(geom);
SQL

# 4. No Test Data
echo ""
echo "4. No test data check:"
psql -h prod.db.railway.internal -U imbobi -d imbobi_prod << SQL
SELECT COUNT(*) as test_records FROM usuarios 
  WHERE email LIKE '%@test.%' OR email LIKE '%@example.%';
SQL

echo ""
echo "=== VALIDATION COMPLETE ==="
```

### Extended Validation (24 hours post-migration)

- [ ] Run full application smoke tests
- [ ] Check database query performance vs baseline
- [ ] Verify all API endpoints functioning
- [ ] Check for any data inconsistencies in application logs
- [ ] Monitor error rates in Sentry
- [ ] Verify backup jobs executing successfully

---

**Document Owner:** Database/DevOps Team  
**Last Review:** 2026-05-31  
**Next Review:** 2026-08-31  
**Emergency Contact:** @on-call | #infrastructure Slack
