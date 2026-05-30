#!/bin/bash

# iMobi MVP Security Audit Script
# Purpose: Automated validation of security configurations before production cutover
# Run: ./SECURITY_AUDIT_SCRIPT.sh [staging|production]
# Date: 2026-05-29

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ENVIRONMENT="${1:-staging}"
PASSED=0
FAILED=0
WARNINGS=0

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"

echo "================================"
echo "iMobi Security Audit"
echo "Environment: $ENVIRONMENT"
echo "Date: $(date)"
echo "================================"
echo ""

# Helper functions
pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
  ((WARNINGS++))
}

# 1. CHECK ENVIRONMENT VARIABLES
echo "1. Environment Variables Validation"
echo "---"

check_env_var() {
  if [ -z "${!1:-}" ]; then
    fail "$1 is not set"
    return 1
  fi
  local val="${!1}"
  if [[ "$val" == *"PLACEHOLDER"* ]] || [[ "$val" == *"change_me"* ]]; then
    fail "$1 contains placeholder value"
    return 1
  fi
  pass "$1 is set and non-empty"
  return 0
}

check_env_var "DATABASE_URL" || true
check_env_var "REDIS_URL" || true
check_env_var "JWT_SECRET" || true
check_env_var "AWS_S3_BUCKET" || true

# Check JWT_SECRET length
if [ -n "${JWT_SECRET:-}" ]; then
  jwt_len=${#JWT_SECRET}
  if [ $jwt_len -lt 64 ]; then
    fail "JWT_SECRET too short (${jwt_len} chars, need ≥64)"
  else
    pass "JWT_SECRET sufficient length (${jwt_len} chars)"
  fi
fi

echo ""

# 2. DATABASE SECURITY
echo "2. Database Security"
echo "---"

# Test PostgreSQL connection
if command -v psql &> /dev/null; then
  if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
    pass "PostgreSQL connection successful"

    # Check if PostGIS is installed
    if psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" &> /dev/null; then
      pass "PostGIS extension available (GPS validation ready)"
    else
      fail "PostGIS extension not available"
    fi
  else
    fail "PostgreSQL connection failed"
  fi
else
  warn "psql not installed, skipping database checks"
fi

echo ""

# 3. REDIS SECURITY
echo "3. Redis Security"
echo "---"

if command -v redis-cli &> /dev/null; then
  # Parse REDIS_URL
  REDIS_HOST=$(echo $REDIS_URL | cut -d'/' -f3 | cut -d':' -f1)
  REDIS_PORT=$(echo $REDIS_URL | cut -d':' -f3 | cut -d'/' -f1)

  if redis-cli -h $REDIS_HOST -p $REDIS_PORT PING &> /dev/null; then
    pass "Redis connection successful"
  else
    fail "Redis connection failed"
  fi

  # Check for AUTH requirement
  if redis-cli -h $REDIS_HOST -p $REDIS_PORT CONFIG GET requirepass 2>/dev/null | grep -q "^[^$]"; then
    pass "Redis requires authentication (requirepass set)"
  else
    if [ "$ENVIRONMENT" = "production" ]; then
      fail "Redis authentication not enabled (required for production)"
    else
      warn "Redis authentication not enabled (warning for production)"
    fi
  fi
else
  warn "redis-cli not installed, skipping Redis checks"
fi

echo ""

# 4. JWT & AUTHENTICATION
echo "4. JWT & Authentication"
echo "---"

# Test API health endpoint (unprotected, should work)
health_response=$(curl -s -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null)
http_code=${health_response: -3}

if [ "$http_code" = "200" ]; then
  pass "API health endpoint accessible (200)"
else
  fail "API health endpoint failed (HTTP $http_code)"
fi

# Test protected endpoint without token (should return 401)
protected_response=$(curl -s -w "%{http_code}" "$API_URL/api/v1/manager/etapas" 2>/dev/null)
http_code=${protected_response: -3}

if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
  pass "Protected endpoints require authentication (HTTP $http_code)"
else
  if [ "$http_code" = "200" ]; then
    fail "Protected endpoint accessible without token (HTTP $http_code) — CRITICAL"
  else
    warn "Protected endpoint returned unexpected code (HTTP $http_code)"
  fi
fi

echo ""

# 5. RATE LIMITING
echo "5. Rate Limiting & Throttling"
echo "---"

echo "Testing rate limiting on /api/v1/health (20 rapid requests)..."
rate_limit_blocked=0
for i in {1..20}; do
  response=$(curl -s -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null)
  http_code=${response: -3}
  if [ "$http_code" = "429" ]; then
    ((rate_limit_blocked++))
  fi
done

if [ $rate_limit_blocked -gt 0 ]; then
  pass "Rate limiting active ($rate_limit_blocked requests blocked out of 20)"
else
  warn "No rate limiting detected on rapid requests (may be OK depending on config)"
fi

echo ""

# 6. CORS HEADERS
echo "6. CORS & Security Headers"
echo "---"

cors_origin=$(curl -s -I -H "Origin: https://app.imbobi.com.br" "$API_URL/api/v1/health" 2>/dev/null | grep -i "Access-Control-Allow-Origin" | cut -d' ' -f2 | tr -d '\r')

if [ -n "$cors_origin" ]; then
  if [ "$cors_origin" = "*" ]; then
    fail "CORS wildcard (*) detected — should whitelist specific origins"
  else
    pass "CORS restricted to: $cors_origin"
  fi
else
  warn "CORS headers not present (may be OK for same-domain setup)"
fi

# Check security headers
security_headers=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -iE "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)" || true)

if [ -n "$security_headers" ]; then
  pass "Security headers present"
  echo "$security_headers" | sed 's/^/  /'
else
  warn "Security headers may be missing (X-Frame-Options, X-Content-Type-Options, HSTS)"
fi

echo ""

# 7. S3 & FILE UPLOAD SECURITY
echo "7. AWS S3 Security"
echo "---"

if command -v aws &> /dev/null; then
  s3_bucket="${AWS_S3_BUCKET:-imbobi-evidencias-prod}"

  # Check bucket versioning
  if aws s3api get-bucket-versioning --bucket $s3_bucket 2>/dev/null | grep -q "Enabled"; then
    pass "S3 versioning enabled on $s3_bucket"
  else
    warn "S3 versioning not enabled on $s3_bucket (recommended for compliance)"
  fi

  # Check bucket encryption
  if aws s3api get-bucket-encryption --bucket $s3_bucket 2>/dev/null | grep -q "ServerSideEncryption"; then
    pass "S3 server-side encryption enabled"
  else
    warn "S3 encryption not explicitly configured (may use AWS default)"
  fi

  # Verify credentials
  identity=$(aws sts get-caller-identity 2>/dev/null)
  if [ -n "$identity" ]; then
    pass "AWS credentials valid and configured"
  else
    fail "AWS credentials invalid or not configured"
  fi
else
  warn "AWS CLI not installed, skipping S3 checks"
fi

echo ""

# 8. GPS VALIDATION (PostGIS)
echo "8. GPS Validation Security"
echo "---"

if command -v psql &> /dev/null; then
  # Test GPS validation with invalid coordinates
  gps_test=$(psql "$DATABASE_URL" -c "SELECT ST_IsValid(ST_GeomFromText('POINT(999.99 999.99)', 4326));" 2>/dev/null | grep -i false)

  if [ -n "$gps_test" ]; then
    pass "PostGIS GPS validation working (rejects invalid coords)"
  else
    warn "Could not verify PostGIS GPS validation"
  fi

  # Check for GPS bounds (Brazil only validation)
  echo "Note: Ensure API validates GPS coordinates are within Brazil bounds"
  echo "  Expected: -5.27°S to 5.27°N, -37°W to -34°W (approximate)"
else
  warn "Cannot verify PostGIS setup without psql"
fi

echo ""

# 9. SECRETS SCANNING
echo "9. Secrets & Sensitive Data"
echo "---"

# Check for hardcoded secrets in codebase
if command -v grep &> /dev/null; then
  echo "Scanning for potential hardcoded secrets in apps/web and services/api..."

  # Search for common patterns (simple check, not comprehensive)
  secret_patterns=("password" "api_key" "secret" "token" "AWS_SECRET")
  found_secrets=0

  for pattern in "${secret_patterns[@]}"; do
    if grep -r -i "\"$pattern\".*=.*\"[^\"]*\"" apps/ services/ 2>/dev/null | grep -v node_modules | grep -v ".next" | head -3; then
      warn "Potential hardcoded secret found: $pattern"
      ((found_secrets++))
    fi
  done

  if [ $found_secrets -eq 0 ]; then
    pass "No obvious hardcoded secrets detected in code scan"
  fi
else
  warn "grep not available, skipping code scan"
fi

echo ""

# 10. DEPENDENCIES AUDIT
echo "10. Dependencies Security"
echo "---"

if command -v npm &> /dev/null; then
  echo "Running npm audit on critical packages..."
  npm audit --omit=dev 2>/dev/null | grep -E "vulnerabilities|packages" || pass "Dependencies check (run 'npm audit' for full report)"
else
  warn "npm not installed, cannot run dependency audit"
fi

echo ""

# 11. ENVIRONMENTAL ISOLATION
echo "11. Environment Isolation"
echo "---"

if [ "$ENVIRONMENT" = "production" ]; then
  # Check NODE_ENV
  if [ "${NODE_ENV:-}" = "production" ]; then
    pass "NODE_ENV set to production"
  else
    fail "NODE_ENV not set to production"
  fi

  # Check no localhost URLs
  if grep -r "localhost" .env* 2>/dev/null | grep -qv ".example"; then
    fail "Localhost URLs found in environment files"
  else
    pass "No localhost URLs in production env"
  fi
else
  pass "Running in $ENVIRONMENT (staging checks skipped)"
fi

echo ""

# SUMMARY
echo "================================"
echo "SECURITY AUDIT SUMMARY"
echo "================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}STATUS: SECURITY AUDIT FAILED${NC}"
  echo "Fix issues above before production deployment."
  exit 1
elif [ $WARNINGS -gt 3 ]; then
  echo -e "${YELLOW}STATUS: SECURITY AUDIT PASSED WITH WARNINGS${NC}"
  echo "Review warnings above and mitigate before cutover."
  exit 0
else
  echo -e "${GREEN}STATUS: SECURITY AUDIT PASSED${NC}"
  echo "All critical security checks passed."
  exit 0
fi
