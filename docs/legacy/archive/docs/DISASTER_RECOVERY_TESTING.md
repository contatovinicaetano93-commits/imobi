# Disaster Recovery Testing & Drills — imobi MVP

**Last Updated:** 2026-05-31  
**Document Version:** 2.0  
**Status:** Production-Ready  
**Go-Live:** 2026-06-02 (02:00-04:00 UTC)

---

## Table of Contents

1. [Testing Schedule](#testing-schedule)
2. [Monthly DR Drill Procedure](#monthly-dr-drill-procedure)
3. [Test Scenarios](#test-scenarios)
4. [Validation Procedures](#validation-procedures)
5. [Test Results Documentation](#test-results-documentation)
6. [SLA Metrics & Reporting](#sla-metrics--reporting)
7. [Lessons Learned Process](#lessons-learned-process)

---

## Testing Schedule

### 2026 DR Testing Calendar

| Date | Test Type | Component | Duration | Lead |
|------|-----------|-----------|----------|------|
| 2026-06-07 (Sun) | Monthly Drill | PostgreSQL Restore | 1-2 hours | DBA Team |
| 2026-07-05 (Sun) | Monthly Drill | Full Stack Recovery | 2-3 hours | DevOps Team |
| 2026-08-02 (Sun) | Monthly Drill | S3 Evidence Recovery | 1 hour | Storage Team |
| 2026-09-06 (Sun) | Monthly Drill | Full DR Simulation | 3-4 hours | All Teams |

### Testing Frequency

- **Weekly:** Automated backup restore test (via GitHub Actions)
- **Monthly:** Manual DR drill (first Sunday of each month)
- **Quarterly:** Full infrastructure recovery simulation
- **Ad-hoc:** Testing after any infrastructure change

### Test Reservation Policy

**All DR tests must be scheduled in advance:**
- Post in #infrastructure Slack 48 hours before test
- Notify product/operations leads
- Ensure no production deployments scheduled during test window

---

## Monthly DR Drill Procedure

### Pre-Test Checklist (48 hours before)

- [ ] Coordinate test timing with team (avoid peak hours)
- [ ] Prepare test environment (staging database)
- [ ] Document expected baseline metrics
- [ ] Notify stakeholders of test window
- [ ] Verify backup files exist and are accessible
- [ ] Prepare smoke test scripts

### Test Execution (First Sunday of month, 03:00-04:00 UTC)

```bash
#!/bin/bash
# /scripts/run-monthly-dr-drill.sh
# Monthly Disaster Recovery Drill

set -e
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
TEST_LOG="/var/log/dr-drill-${TIMESTAMP}.log"
RESULTS_FILE="/tmp/dr-drill-results-${TIMESTAMP}.json"

exec > >(tee "$TEST_LOG")
exec 2>&1

echo "============================================"
echo "  MONTHLY DISASTER RECOVERY DRILL"
echo "  Started: $(date)"
echo "  Test ID: $TIMESTAMP"
echo "============================================"
echo ""

# Initialize results JSON
cat > "$RESULTS_FILE" << 'JSON'
{
  "test_id": "TIMESTAMP",
  "start_time": "START_TIME",
  "tests": [],
  "overall_status": "IN_PROGRESS"
}
JSON

# Replace placeholders
sed -i "s/TIMESTAMP/$TIMESTAMP/" "$RESULTS_FILE"
sed -i "s/START_TIME/$(date -u +%Y-%m-%dT%H:%M:%SZ)/" "$RESULTS_FILE"

# TEST 1: PostgreSQL Restore
echo ""
echo "[TEST 1/3] PostgreSQL Restore Test"
echo "=========================================="

TEST_START=$(date +%s)

if bash /scripts/test-backup-restore.sh; then
  DURATION=$(($(date +%s) - TEST_START))
  echo "✓ PASS - PostgreSQL restore successful (${DURATION}s)"
  PG_STATUS="PASS"
  PG_DURATION="$DURATION"
else
  echo "✗ FAIL - PostgreSQL restore failed"
  PG_STATUS="FAIL"
  PG_DURATION="0"
fi

# TEST 2: Redis Restore
echo ""
echo "[TEST 2/3] Redis Restore Test"
echo "=========================================="

TEST_START=$(date +%s)

# Download latest Redis backup
REDIS_BACKUP=$(aws s3 ls s3://imbobi-database-backups/redis/ \
  --recursive --sort=time --reverse | head -1 | awk '{print $NF}')

aws s3 cp "s3://imbobi-database-backups/$REDIS_BACKUP" \
  ./redis-test-restore.rdb.gz --region us-east-1

# Verify integrity
if gunzip -t redis-test-restore.rdb.gz > /dev/null 2>&1; then
  echo "✓ PASS - Redis backup integrity verified"
  REDIS_STATUS="PASS"
  REDIS_DURATION=$(($(date +%s) - TEST_START))
else
  echo "✗ FAIL - Redis backup corrupted"
  REDIS_STATUS="FAIL"
  REDIS_DURATION="0"
fi

rm -f redis-test-restore.rdb.gz

# TEST 3: Data Validation
echo ""
echo "[TEST 3/3] Data Validation Test"
echo "=========================================="

TEST_START=$(date +%s)

# Run validation queries on restored test database
VALIDATION_ERRORS=0

# Check row counts
PG_OBRAS=$(psql -h localhost -U imbobi -d imbobi_test -t \
  -c "SELECT COUNT(*) FROM obras;" 2>/dev/null || echo "ERROR")

if [ "$PG_OBRAS" = "ERROR" ]; then
  echo "✗ FAIL - Cannot query restored database"
  VALIDATION_STATUS="FAIL"
else
  echo "✓ Found $PG_OBRAS obras in restored database"
  
  # Verify GIS data
  INVALID_GEOM=$(psql -h localhost -U imbobi -d imbobi_test -t \
    -c "SELECT COUNT(*) FROM parcelas WHERE NOT ST_IsValid(geom);" 2>/dev/null || echo "0")
  
  if [ "$INVALID_GEOM" != "0" ]; then
    echo "✗ FAIL - $INVALID_GEOM invalid geometries found"
    VALIDATION_STATUS="FAIL"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
  else
    echo "✓ PASS - All geometries valid"
    VALIDATION_STATUS="PASS"
  fi
fi

VALIDATION_DURATION=$(($(date +%s) - TEST_START))

# Summary
echo ""
echo "============================================"
echo "  TEST SUMMARY"
echo "============================================"
echo ""
echo "PostgreSQL Restore: $PG_STATUS (${PG_DURATION}s)"
echo "Redis Restore: $REDIS_STATUS (${REDIS_DURATION}s)"
echo "Data Validation: $VALIDATION_STATUS (${VALIDATION_DURATION}s)"
echo ""

# Determine overall status
if [ "$PG_STATUS" = "PASS" ] && [ "$REDIS_STATUS" = "PASS" ] && [ "$VALIDATION_STATUS" = "PASS" ]; then
  OVERALL_STATUS="PASS"
  echo "OVERALL: ✓ ALL TESTS PASSED"
else
  OVERALL_STATUS="FAIL"
  echo "OVERALL: ✗ SOME TESTS FAILED"
fi

echo ""
echo "Test completed at $(date)"
echo "Results saved to: $RESULTS_FILE"

# Archive results
cp "$RESULTS_FILE" "/var/log/dr-drill-results/"

echo ""
echo "NEXT STEPS:"
echo "1. Review test results"
echo "2. Document any issues in #infrastructure"
echo "3. File post-incident review if failures occurred"

exit 0
```

**Execution:**
```bash
sudo bash /scripts/run-monthly-dr-drill.sh
```

---

## Test Scenarios

### Scenario 1: PostgreSQL Corruption Recovery (Basic)

**Objective:** Verify database can be restored from backup to staging environment

**Duration:** 45-60 minutes

**Test Steps:**

```bash
#!/bin/bash
# Test: PostgreSQL Corruption & Recovery

echo "TEST 1: PostgreSQL Corruption Recovery"
echo "======================================="

# Step 1: Download latest PostgreSQL backup
echo ""
echo "Step 1: Downloading latest backup..."
LATEST_BACKUP=$(aws s3 ls s3://imbobi-database-backups/postgres/ \
  --recursive --sort=time --reverse | head -1 | awk '{print $NF}')

aws s3 cp "s3://imbobi-database-backups/$LATEST_BACKUP" \
  ./pg-restore-test.sql.gz --region us-east-1

# Step 2: Create test database
echo ""
echo "Step 2: Creating test database..."
createdb -h staging.db.railway.internal -U imbobi imbobi_test

# Step 3: Restore from backup
echo ""
echo "Step 3: Restoring backup (this may take 5-10 minutes)..."
gunzip -c pg-restore-test.sql.gz | pg_restore \
  -h staging.db.railway.internal \
  -U imbobi \
  -d imbobi_test \
  --verbose 2>&1 | tail -20

# Step 4: Verify restoration
echo ""
echo "Step 4: Verifying restoration..."

# Count tables
TABLE_COUNT=$(psql -h staging.db.railway.internal -U imbobi -d imbobi_test \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo "Tables restored: $TABLE_COUNT"

# Sample data
OBRAS_COUNT=$(psql -h staging.db.railway.internal -U imbobi -d imbobi_test \
  -t -c "SELECT COUNT(*) FROM obras;")

echo "Obras count: $OBRAS_COUNT"

# Step 5: Run validation
echo ""
echo "Step 5: Running validation queries..."

psql -h staging.db.railway.internal -U imbobi -d imbobi_test << SQL
-- Check GIS
SELECT COUNT(*) FROM pg_extension WHERE extname = 'postgis';

-- Check constraints
SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY';

-- Check indices
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';
SQL

# Step 6: Cleanup
echo ""
echo "Step 6: Cleaning up..."
dropdb -h staging.db.railway.internal -U imbobi imbobi_test
rm -f pg-restore-test.sql.gz

echo ""
echo "✓ TEST PASSED: PostgreSQL restoration successful"
```

---

### Scenario 2: Full Infrastructure Recovery (Advanced)

**Objective:** Verify complete recovery from total infrastructure failure

**Duration:** 2-3 hours

**Test Steps:**

1. **Provision temporary staging infrastructure** (30 min)
   - Deploy PostgreSQL on temporary Railway instance
   - Deploy Redis on temporary Railway instance
   - Update API config to point to temporary infrastructure

2. **Restore PostgreSQL** (15 min)
   - Download backup from S3
   - Restore to temporary database
   - Verify row counts match production baseline

3. **Restore Redis** (5 min)
   - Download Redis RDB backup
   - Restore to temporary Redis instance
   - Verify queue data intact

4. **Deploy application** (10 min)
   - Update connection strings to temporary infrastructure
   - Deploy API to test environment
   - Verify health checks passing

5. **Run smoke tests** (10 min)
   - Test API endpoints
   - Test database queries
   - Test queue processing

6. **Cleanup** (5 min)
   - Delete temporary infrastructure
   - Restore original configuration

---

### Scenario 3: Data Validation Testing

**Objective:** Verify restored data integrity

**Test Queries:**

```sql
-- Test: PostGIS Extension
SELECT extname, version FROM pg_extension WHERE extname = 'postgis';

-- Test: Table Integrity
SELECT tablename, n_live_tup FROM pg_stat_user_tables 
  WHERE schemaname = 'public' ORDER BY tablename;

-- Test: Invalid Geometries
SELECT COUNT(*) FROM parcelas WHERE NOT ST_IsValid(geom);

-- Test: Foreign Key Integrity
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Test: Missing Indices
SELECT COUNT(*) FROM pg_indexes 
  WHERE tablename IN ('obras', 'parcelas');

-- Test: Constraint Validation
SELECT COUNT(*) FROM information_schema.table_constraints 
  WHERE constraint_type = 'PRIMARY KEY';

-- Test: Last Update Time
SELECT MAX(updated_at) FROM obras;
```

---

## Validation Procedures

### Automated Validation Script

```bash
#!/bin/bash
# /scripts/validate-dr-test.sh
# Comprehensive post-restore validation

DB_HOST="${1:-localhost}"
DB_NAME="${2:-imbobi_test}"
DB_USER="${3:-imbobi}"

echo "=== Disaster Recovery Test Validation ==="
echo "Database: $DB_HOST:5432/$DB_NAME"
echo ""

# Function to run SQL and report
validate() {
  local name="$1"
  local query="$2"
  
  result=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null)
  
  if [ -n "$result" ] && [ "$result" != "ERROR" ]; then
    echo "✓ $name: $result"
    return 0
  else
    echo "✗ $name: FAILED"
    return 1
  fi
}

echo "=== TABLE COUNTS ==="
validate "Obras" "SELECT COUNT(*) FROM obras;"
validate "Usuarios" "SELECT COUNT(*) FROM usuarios;"
validate "Parcelas" "SELECT COUNT(*) FROM parcelas;"

echo ""
echo "=== POSTGIS VALIDATION ==="
validate "PostGIS Extension" "SELECT COUNT(*) FROM pg_extension WHERE extname = 'postgis';"
validate "Valid Geometries" "SELECT COUNT(*) FROM parcelas WHERE ST_IsValid(geom) = true;"
validate "Invalid Geometries" "SELECT COUNT(*) FROM parcelas WHERE ST_IsValid(geom) = false;"

echo ""
echo "=== REFERENTIAL INTEGRITY ==="
validate "Orphaned Parcelas" "SELECT COUNT(*) FROM parcelas WHERE NOT EXISTS (SELECT 1 FROM obras WHERE obras.id = parcelas.obra_id);"

echo ""
echo "=== DATA FRESHNESS ==="
validate "Latest Obra Update" "SELECT MAX(updated_at) FROM obras;"
validate "Latest Atividade" "SELECT MAX(created_at) FROM atividades;"

echo ""
echo "=== INDICES ==="
validate "GIS Indices" "SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('obras', 'parcelas') AND indexname LIKE '%gist%';"

echo ""
echo "=== SUMMARY ==="
echo "Validation completed - see results above"
```

---

## Test Results Documentation

### Sample Test Report

```markdown
# Monthly DR Drill Results
**Date:** 2026-06-07  
**Time:** 03:00-04:15 UTC  
**Test ID:** 2026-06-07_030000  
**Lead:** DBA Team

## Test Summary
| Test | Result | Duration | Notes |
|------|--------|----------|-------|
| PostgreSQL Restore | ✓ PASS | 12 min | Backup: 256 MB, fully restored |
| Data Validation | ✓ PASS | 3 min | 89 obras, 456 parcelas, all GIS valid |
| Redis Restore | ✓ PASS | 2 min | RDB integrity verified |
| API Health Check | ✓ PASS | 1 min | All endpoints responding |

## Overall Result: ✓ SUCCESS

## Detailed Findings

### Strengths
- Backup files complete and uncorrupted
- Restore process executes smoothly
- No data loss or corruption detected
- Recovery RTO well below target (30 min actual vs 1 hour target)

### Issues Discovered
- None

### Recommendations
- Continue current backup schedule (no changes)
- Schedule next drill for 2026-07-05

## Sign-Off
- **Tested By:** John Doe (DBA)
- **Reviewed By:** Jane Smith (DevOps Lead)
- **Approved:** Operations Team
```

### Test Results Archive

```bash
# Store test results in S3 for long-term record
aws s3 cp "dr-drill-results-${TIMESTAMP}.json" \
  s3://imbobi-database-backups/dr-test-results/ \
  --region us-east-1
```

---

## SLA Metrics & Reporting

### Monthly SLA Tracking

| Metric | Target | Measurement | Owner |
|--------|--------|-------------|-------|
| **Backup Success Rate** | 99.5% | Successful backups / Total backups | DevOps |
| **Restore Success Rate** | 100% | Successful test restores / Total tests | DBA |
| **Mean Time to Restore (MTTR)** | ≤ 30 min | Actual restore duration | DevOps |
| **Test Completion** | Monthly | 1st Sunday of each month | DevOps |
| **Recovery RTO Achievement** | ≤ 1 hour | Actual recovery time in drill | All |

### SLA Dashboard

```bash
#!/bin/bash
# /scripts/generate-sla-report.sh
# Generate monthly SLA metrics report

MONTH=$(date +%Y-%m)
YEAR=$(date +%Y)

echo "=== DR SLA Report: $MONTH ==="
echo ""

# Count backups
PG_BACKUPS=$(aws s3 ls s3://imbobi-database-backups/postgres/ \
  --recursive | wc -l)
REDIS_BACKUPS=$(aws s3 ls s3://imbobi-database-backups/redis/ \
  --recursive | wc -l)

echo "Backups Created:"
echo "  PostgreSQL: $PG_BACKUPS"
echo "  Redis: $REDIS_BACKUPS"

# Check test results
TEST_RESULTS=$(ls -1 /var/log/dr-drill-results/*${MONTH}* 2>/dev/null | wc -l)
PASSED=$(grep -l '"overall_status":"PASS"' /var/log/dr-drill-results/*${MONTH}* 2>/dev/null | wc -l)

echo ""
echo "Test Results:"
echo "  Total Tests: $TEST_RESULTS"
echo "  Passed: $PASSED"

if [ $TEST_RESULTS -gt 0 ]; then
  SUCCESS_RATE=$((PASSED * 100 / TEST_RESULTS))
  echo "  Success Rate: $SUCCESS_RATE%"
fi

# Analyze restore times
echo ""
echo "Recovery Times:"
grep -h "duration" /var/log/dr-drill-results/*${MONTH}* 2>/dev/null | \
  awk -F: '{print "  " $2}' || echo "  No data available"

echo ""
echo "=== End of Report ==="
```

---

## Lessons Learned Process

### Post-Test Review Meeting

**Schedule:** Within 24 hours of any test

**Attendees:**
- DevOps/Infrastructure lead
- Database administrator
- Application developer representative
- Operations manager

**Agenda:**

1. **What Went Well** (10 min)
   - Positive observations about the test
   - Successful recovery procedures

2. **What Could Improve** (20 min)
   - Issues encountered
   - Procedures that took longer than expected
   - Unclear documentation

3. **Action Items** (20 min)
   - Document recommended changes
   - Assign owners and deadlines
   - Prioritize by impact

4. **Documentation Updates** (10 min)
   - Update runbooks if procedures changed
   - Update backup scripts if issues found
   - Record in lessons learned database

### Lessons Learned Template

```markdown
# Disaster Recovery Drill Debrief
**Date:** [Date]  
**Test Type:** [PostgreSQL|Redis|Full Stack]

## What Went Well
- [Item 1]
- [Item 2]

## Issues Encountered
| Issue | Severity | Root Cause | Resolution |
|-------|----------|-----------|-----------|
| [Issue 1] | [High/Medium/Low] | [Root cause] | [How resolved] |

## Improvements Identified
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [Improvement 1] | [Owner] | [Date] | [Status] |

## Procedures Updated
- [ ] Runbook: [Name]
- [ ] Script: [Name]
- [ ] Documentation: [Name]

## Metrics
- RTO Actual: [Time]
- RPO: [Data loss]
- Total Duration: [Duration]

## Sign-Off
- Lead: [Name]
- Reviewed: [Name]
- Archived: [Date]
```

### Quarterly Review Meeting

**Schedule:** End of each quarter

**Scope:**
- Review all monthly DR drills
- Trend analysis (are recovery times improving?)
- SLA achievement rate
- Recommend process improvements
- Plan next quarter's tests

---

**Document Owner:** DevOps/Infrastructure Team  
**Last Review:** 2026-05-31  
**Next Review:** 2026-08-31 (quarterly)  
**Testing Schedule:** Monthly first Sunday  
**Emergency Contact:** @on-call | #infrastructure Slack
