#!/bin/sh
# Validate required env vars before deploy.
# Usage: ENV_FILE=.env.prod sh scripts/validate-env.sh

set -e

ENV_FILE="${ENV_FILE:-.env}"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
fi

ERRORS=0

check() {
  VAR=$1
  VAL=$(eval echo "\$$VAR")
  if [ -z "$VAL" ]; then
    echo "MISSING: $VAR"
    ERRORS=$((ERRORS + 1))
  fi
}

# Required in production
check DATABASE_URL
check REDIS_HOST
check REDIS_PORT
check JWT_SECRET
check CORS_ORIGIN
check APP_URL
check AWS_S3_BUCKET
check AWS_S3_REGION
check AWS_ACCESS_KEY_ID
check AWS_SECRET_ACCESS_KEY
check FIREBASE_PROJECT_ID
check FIREBASE_PRIVATE_KEY
check FIREBASE_CLIENT_EMAIL
check SENTRY_DSN

# JWT_SECRET length check
if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 64 ]; then
  echo "WEAK: JWT_SECRET deve ter >= 64 caracteres (atual: ${#JWT_SECRET})"
  ERRORS=$((ERRORS + 1))
fi

# Localhost check
if echo "$CORS_ORIGIN$APP_URL$DATABASE_URL" | grep -q "localhost"; then
  echo "WARNING: localhost detectado em variável de produção"
fi

if [ "$ERRORS" -eq 0 ]; then
  echo "OK: todas as variáveis obrigatórias estão configuradas."
  exit 0
else
  echo ""
  echo "ERRO: $ERRORS variável(is) ausente(s). Corrija antes de fazer deploy."
  exit 1
fi
