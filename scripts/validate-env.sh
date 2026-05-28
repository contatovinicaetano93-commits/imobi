#!/bin/bash

# Environment Variables Security Validation Script
# Purpose: Validates critical environment variables for security compliance
# Exit Code: 0 (all checks passed), 1 (one or more checks failed)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Helper functions
check_var_set() {
    local var_name="$1"
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} $var_name is not set"
        FAILED=$((FAILED + 1))
        return 1
    fi
    echo -e "${GREEN}✓${NC} $var_name is set"
    return 0
}

check_var_length() {
    local var_name="$1"
    local min_length="$2"
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} $var_name is not set"
        FAILED=$((FAILED + 1))
        return 1
    fi

    local actual_length=${#var_value}
    if [ "$actual_length" -lt "$min_length" ]; then
        echo -e "${RED}✗${NC} $var_name must be at least $min_length characters (current: $actual_length)"
        FAILED=$((FAILED + 1))
        return 1
    fi
    echo -e "${GREEN}✓${NC} $var_name length check passed ($actual_length chars)"
    return 0
}

check_var_contains() {
    local var_name="$1"
    local pattern="$2"
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} $var_name is not set"
        FAILED=$((FAILED + 1))
        return 1
    fi

    if [[ ! "$var_value" =~ $pattern ]]; then
        echo -e "${RED}✗${NC} $var_name does not match expected pattern: $pattern"
        FAILED=$((FAILED + 1))
        return 1
    fi
    echo -e "${GREEN}✓${NC} $var_name format check passed"
    return 0
}

check_var_in_values() {
    local var_name="$1"
    shift
    local allowed_values=("$@")
    local var_value="${!var_name}"

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗${NC} $var_name is not set"
        FAILED=$((FAILED + 1))
        return 1
    fi

    for allowed in "${allowed_values[@]}"; do
        if [ "$var_value" = "$allowed" ]; then
            echo -e "${GREEN}✓${NC} $var_name is set to valid value: $var_value"
            return 0
        fi
    done

    echo -e "${RED}✗${NC} $var_name must be one of: ${allowed_values[*]}"
    FAILED=$((FAILED + 1))
    return 1
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Environment Variables Security Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Core Configuration ──────────────────────────────
echo "Core Configuration:"
check_var_in_values NODE_ENV "development" "staging" "production"
check_var_set PORT

echo ""

# ── JWT Secrets ─────────────────────────────────────
echo "JWT Authentication Secrets:"
check_var_length JWT_SECRET 64
check_var_length JWT_REFRESH_SECRET 64
check_var_set JWT_EXPIRES_IN
check_var_set JWT_REFRESH_EXPIRES_IN

echo ""

# ── Data Encryption ─────────────────────────────────
echo "Data Encryption (AES-256-GCM):"
check_var_length ENCRYPTION_SECRET 32

echo ""

# ── Database ────────────────────────────────────────
echo "Database Configuration:"
check_var_set DATABASE_URL
check_var_contains DATABASE_URL "^postgres"

echo ""

# ── Redis ───────────────────────────────────────────
echo "Redis Configuration:"
check_var_set REDIS_HOST
check_var_set REDIS_PORT

echo ""

# ── CORS ────────────────────────────────────────────
echo "CORS Configuration:"
check_var_set CORS_ORIGIN

# Warn if CORS is wildcard in production
NODE_ENV="${NODE_ENV:-development}"
if [ "$NODE_ENV" = "production" ] && [ "$CORS_ORIGIN" = "*" ]; then
    echo -e "${YELLOW}⚠${NC}  CORS is set to wildcard (*) in production - this is NOT RECOMMENDED"
    FAILED=$((FAILED + 1))
fi

echo ""

# ── AWS S3 Configuration ────────────────────────────
echo "AWS S3 Configuration:"
if [ "$NODE_ENV" = "production" ]; then
    check_var_set S3_BUCKET
    check_var_set AWS_ACCESS_KEY_ID
    check_var_set AWS_SECRET_ACCESS_KEY
    check_var_set AWS_REGION
else
    echo -e "${YELLOW}⚠${NC}  Skipping S3 checks (non-production environment)"
fi

echo ""

# ── Email Configuration ─────────────────────────────
echo "Email Configuration:"
SENDGRID_API_KEY="${SENDGRID_API_KEY:-}"
SMTP_PASS="${SMTP_PASS:-}"

if [ -z "$SENDGRID_API_KEY" ] && [ -z "$SMTP_PASS" ]; then
    echo -e "${YELLOW}⚠${NC}  No email service configured (SENDGRID_API_KEY or SMTP_PASS)"
else
    echo -e "${GREEN}✓${NC} Email service is configured"
fi

echo ""

# ── Final Report ────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All environment validation checks passed!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}✗ $FAILED validation check(s) failed!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
