#!/bin/bash
# Validate that all required Vercel environment variables are configured
# Usage: ./scripts/validate-vercel-env.sh

set -e

REQUIRED_VARS=(
  "DATABASE_URL"
  "NEXT_PUBLIC_SENTRY_DSN"
  "AWS_REGION"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_S3_BUCKET"
  "SENDGRID_API_KEY"
  "REDIS_URL"
  "NEXT_PUBLIC_API_URL"
  "CORS_ORIGIN"
  "NODE_ENV"
  "EMAIL_PROVIDER"
)

PUBLIC_VARS=(
  "NEXT_PUBLIC_SENTRY_DSN"
  "NEXT_PUBLIC_API_URL"
  "NODE_ENV"
  "EMAIL_PROVIDER"
  "CORS_ORIGIN"
)

echo "🔍 Validating Vercel environment variables..."
echo ""

MISSING=()
CONFIGURED=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING+=("$var")
    echo "❌ Missing: $var"
  else
    CONFIGURED+=("$var")
    echo "✅ Configured: $var"
  fi
done

echo ""
echo "📊 Summary:"
echo "  ✅ Configured: ${#CONFIGURED[@]}/${#REQUIRED_VARS[@]}"
echo "  ❌ Missing: ${#MISSING[@]}/${#REQUIRED_VARS[@]}"

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  Missing variables (configure in Vercel Dashboard → Settings → Environment Variables):"
  for var in "${MISSING[@]}"; do
    is_public=false
    for public_var in "${PUBLIC_VARS[@]}"; do
      if [ "$var" = "$public_var" ]; then
        is_public=true
        break
      fi
    done

    if $is_public; then
      echo "  - $var (scope: Production, Public)"
    else
      echo "  - $var (scope: Production, Secret ⚠️)"
    fi
  done

  exit 1
else
  echo ""
  echo "✨ All environment variables configured!"
  echo ""
  echo "🚀 Ready to deploy to Vercel"
  exit 0
fi
