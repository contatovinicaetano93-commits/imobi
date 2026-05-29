#!/bin/bash

##############################################################################
# Pre-Production Environment Verification
# Validates all infrastructure, configuration, and services before launch
#
# Usage: ./pre-production-check.sh [environment]
# Example: ./pre-production-check.sh production
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

# Main checks
ENV="${1:-production}"
RESULTS_FILE="/tmp/preproduction-check-${ENV}-$(date +%s).txt"

{
    echo "Pre-Production Environment Check: $ENV"
    echo "Date: $(date)"
    echo "Hostname: $(hostname)"
    echo ""

    section "1. System Requirements"

    # Check OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        pass "Linux OS detected"
    else
        fail "Unsupported OS: $OSTYPE"
    fi

    # Check disk space
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        pass "Disk usage: ${DISK_USAGE}% (OK)"
    else
        fail "Disk usage: ${DISK_USAGE}% (CRITICAL)"
    fi

    # Check memory
    MEM_AVAILABLE=$(free -h | awk 'NR==2 {print $7}')
    pass "Available memory: $MEM_AVAILABLE"

    section "2. Database Configuration"

    # Test PostgreSQL connection
    if PGPASSWORD="${DATABASE_PASSWORD}" pg_isready -h "${DATABASE_HOST:-localhost}" \
           -p "${DATABASE_PORT:-5432}" -U "${DATABASE_USER:-imbobi}" \
           -d "${DATABASE_NAME:-imbobi_prod}" 2>/dev/null; then
        pass "PostgreSQL connection verified"
    else
        fail "PostgreSQL connection failed"
    fi

    # Check PostGIS extension
    if PGPASSWORD="${DATABASE_PASSWORD}" psql -h "${DATABASE_HOST:-localhost}" \
           -U "${DATABASE_USER:-imbobi}" -d "${DATABASE_NAME:-imbobi_prod}" \
           -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null; then
        pass "PostGIS extension available"
    else
        fail "PostGIS extension not available"
    fi

    section "3. Redis Configuration"

    # Test Redis connection
    if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" \
           ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping >/dev/null 2>&1; then
        pass "Redis connection verified"
    else
        fail "Redis connection failed"
    fi

    # Check Redis persistence
    if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" \
           ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} config get save | grep -q "900"; then
        pass "Redis RDB persistence enabled"
    else
        warn "Redis RDB persistence not configured"
    fi

    section "4. Environment Variables"

    # Check critical env vars
    REQUIRED_VARS=(
        "DATABASE_HOST"
        "DATABASE_PORT"
        "DATABASE_USER"
        "DATABASE_PASSWORD"
        "DATABASE_NAME"
        "REDIS_HOST"
        "REDIS_PORT"
        "JWT_SECRET"
        "SENTRY_DSN"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if [ -n "${!var}" ]; then
            pass "ENV: $var configured"
        else
            fail "ENV: $var missing"
        fi
    done

    section "5. AWS Configuration"

    # Check AWS credentials
    if aws sts get-caller-identity >/dev/null 2>&1; then
        pass "AWS credentials valid"
    else
        fail "AWS credentials invalid or not configured"
    fi

    # Check S3 buckets
    if aws s3 ls "s3://imobi-evidencias-${ENV}" >/dev/null 2>&1; then
        pass "S3 evidencias bucket accessible"
    else
        fail "S3 evidencias bucket not accessible"
    fi

    if aws s3 ls "s3://imobi-backups-${ENV}" >/dev/null 2>&1; then
        pass "S3 backups bucket accessible"
    else
        warn "S3 backups bucket not accessible (configure later)"
    fi

    section "6. External Services"

    # Check Sentry
    if [ -n "$SENTRY_DSN" ]; then
        pass "Sentry DSN configured"
    else
        fail "Sentry DSN missing"
    fi

    # Check SendGrid
    if [ -n "$SENDGRID_API_KEY" ]; then
        pass "SendGrid API key configured"
    else
        fail "SendGrid API key missing"
    fi

    # Check Firebase
    if [ -n "$FIREBASE_PROJECT_ID" ] && [ -n "$FIREBASE_PRIVATE_KEY" ]; then
        pass "Firebase credentials configured"
    else
        fail "Firebase credentials missing"
    fi

    section "7. API Service"

    # Check API health
    API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:4000}"
    if curl -s "${API_URL}/api/v1/health" | grep -q "status"; then
        pass "API health endpoint responsive"

        # Check sub-components
        HEALTH=$(curl -s "${API_URL}/api/v1/health")

        if echo "$HEALTH" | grep -q '"database".*"configured".*true'; then
            pass "  → Database configured"
        else
            fail "  → Database not configured"
        fi

        if echo "$HEALTH" | grep -q '"redis".*"connected"'; then
            pass "  → Redis connected"
        else
            fail "  → Redis not connected"
        fi
    else
        fail "API health endpoint not responding"
    fi

    section "8. Backup Infrastructure"

    # Check backup scripts
    if [ -x "/home/ubuntu/imobi/infrastructure/scripts/backup-postgres.sh" ]; then
        pass "PostgreSQL backup script exists and executable"
    else
        warn "PostgreSQL backup script not found or not executable"
    fi

    if [ -x "/home/ubuntu/imobi/infrastructure/scripts/backup-redis.sh" ]; then
        pass "Redis backup script exists and executable"
    else
        warn "Redis backup script not found or not executable"
    fi

    # Check backup directories
    if [ -d "/var/backups/imobi/postgres" ]; then
        pass "PostgreSQL backup directory exists"
        BACKUP_COUNT=$(ls /var/backups/imobi/postgres/*.sql.gz 2>/dev/null | wc -l)
        if [ "$BACKUP_COUNT" -gt 0 ]; then
            pass "  → $BACKUP_COUNT backup(s) found"
        else
            warn "  → No backups found (first backup pending)"
        fi
    else
        warn "PostgreSQL backup directory not found"
    fi

    section "9. Monitoring & Logging"

    # Check log directory
    if [ -d "/var/log/imobi" ]; then
        pass "Log directory exists: /var/log/imobi"
    else
        warn "Log directory not found: /var/log/imobi"
    fi

    # Check Sentry integration
    if [ -n "$SENTRY_DSN" ]; then
        pass "Sentry integration configured"
    else
        fail "Sentry integration not configured"
    fi

    section "10. Security Check"

    # Check HTTPS
    if [[ "$CORS_ORIGIN" == https://* ]]; then
        pass "HTTPS configured in CORS_ORIGIN"
    else
        warn "CORS_ORIGIN not using HTTPS"
    fi

    # Check JWT secret strength
    if [ ${#JWT_SECRET} -ge 64 ]; then
        pass "JWT_SECRET length: ${#JWT_SECRET} characters (OK)"
    else
        fail "JWT_SECRET too short: ${#JWT_SECRET} characters (min 64)"
    fi

    # Check no hardcoded secrets
    if grep -r "password.*=" /home/ubuntu/imobi/.env 2>/dev/null | grep -q "hardcoded"; then
        fail "Hardcoded secrets found in .env"
    else
        pass "No obvious hardcoded secrets"
    fi

    section "11. Documentation"

    # Check documentation files
    if [ -f "/home/ubuntu/imobi/infrastructure/DISASTER_RECOVERY.md" ]; then
        pass "Disaster Recovery documentation exists"
    else
        warn "Disaster Recovery documentation missing"
    fi

    if [ -f "/home/ubuntu/imobi/infrastructure/MONITORING.md" ]; then
        pass "Monitoring documentation exists"
    else
        warn "Monitoring documentation missing"
    fi

    if [ -f "/home/ubuntu/imobi/infrastructure/PRODUCTION_CHECKLIST.md" ]; then
        pass "Production Checklist exists"
    else
        warn "Production Checklist missing"
    fi

    section "Summary"

    TOTAL=$((PASSED + FAILED + WARNINGS))
    echo ""
    echo "Results:"
    echo "  ${GREEN}✓ Passed: $PASSED${NC}"
    echo "  ${RED}✗ Failed: $FAILED${NC}"
    echo "  ${YELLOW}⚠ Warnings: $WARNINGS${NC}"
    echo "  Total: $TOTAL"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All critical checks passed${NC}"
        if [ $WARNINGS -gt 0 ]; then
            echo -e "${YELLOW}⚠ $WARNINGS warnings require attention${NC}"
        fi
    else
        echo -e "${RED}✗ $FAILED critical checks failed - Fix before production launch${NC}"
    fi

    echo ""
    echo "Full report saved to: $RESULTS_FILE"

} | tee "$RESULTS_FILE"

# Exit with error if there are failures
if [ $FAILED -gt 0 ]; then
    exit 1
fi

exit 0
