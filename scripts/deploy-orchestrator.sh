#!/bin/bash

# Imobi MVP - Deployment Orchestrator (Vercel + Render)
# Usage: bash scripts/deploy-orchestrator.sh [--yes] [api-url]

set -e

YES=0
if [ "${1:-}" = "--yes" ]; then
  YES=1
  shift
fi

confirm() {
  local prompt="$1"
  if [ "$YES" -eq 1 ]; then
    return 0
  fi
  read -p "$prompt (y/n) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]]
}

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEFAULT_API_URL="https://imobi-api-staging.onrender.com"
API_URL="${1:-$DEFAULT_API_URL}"

echo -e "${BLUE}🚀 Imobi MVP - Deployment Orchestrator (Render + Vercel)${NC}\n"
echo -e "Fonte única: ${BLUE}docs/DEPLOY_STACK.md${NC}\n"

echo -e "${BLUE}📋 Deployment Plan${NC}"
echo "Phase 1: API health (Render)"
echo "Phase 2: Post-deploy verification"
echo "Phase 3: Frontend env (Vercel / local)"
echo "Phase 4: Auth smoke test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Phase 1: API health
echo -e "${BLUE}⏳ Phase 1: Checking API on Render...${NC}"
echo "API URL: $API_URL"

if curl -s -f "${API_URL}/api/v1/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} API is responding"
else
  echo -e "${YELLOW}⚠️  API not yet responding (cold start or deploy in progress)${NC}"
  if confirm "Wait 30 seconds and retry?"; then
    sleep 30
    if ! curl -s -f "${API_URL}/api/v1/health" > /dev/null 2>&1; then
      echo -e "${RED}✗ API still not responding.${NC}"
      echo "→ Redeploy: pnpm render:redeploy"
      echo "→ Logs: https://dashboard.render.com"
      exit 1
    fi
    echo -e "${GREEN}✓${NC} API now responding"
  else
    exit 1
  fi
fi

# Phase 2: Migrations reminder
echo -e "\n${BLUE}⏳ Phase 2: Database migrations${NC}"
echo -e "${YELLOW}If schema changed:${NC}"
echo "  Render Shell → cd services/api && npx prisma migrate deploy"
echo ""
if ! confirm "Migrations up to date?"; then
  echo "Run migrations on Render, then re-run this script."
  exit 1
fi

# Phase 3: Verification
echo -e "\n${BLUE}⏳ Phase 3: Post-deployment verification...${NC}"
bash scripts/post-deploy-verification.sh "$API_URL"
VERIFY_EXIT=$?

if [ $VERIFY_EXIT -ne 0 ]; then
  echo -e "${RED}Verification failed. Check Render logs.${NC}"
  exit 1
fi

# Phase 4: Frontend
echo -e "\n${BLUE}⏳ Phase 4: Frontend integration...${NC}"

cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=$API_URL
EOF

echo -e "${GREEN}✓${NC} Created apps/web/.env.local"
echo ""
echo "Production web: push env to Vercel with:"
echo "  pnpm vercel:env:push"
echo ""

# Phase 5: Auth smoke test
echo -e "${BLUE}🧪 Auth smoke test${NC}"

TEST_EMAIL="test-$(date +%s)@imobi.test"
TEST_PASSWORD="TestPass123!@"
TEST_CPF=$(printf "%011d" $(( $(date +%s) % 100000000000 )))

REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/registrar" \
  -H 'Content-Type: application/json' \
  -d "{
    \"nome\": \"Test User\",
    \"email\": \"${TEST_EMAIL}\",
    \"cpf\": \"${TEST_CPF}\",
    \"telefone\": \"11999999999\",
    \"senha\": \"${TEST_PASSWORD}\",
    \"consentidoTermos\": true,
    \"consentidoPrivacy\": true,
    \"consentidoKyc\": true
  }")

if echo "$REGISTER_RESPONSE" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} Registration successful"
else
  echo -e "${RED}✗${NC} Registration failed"
  exit 1
fi

LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"${TEST_EMAIL}\", \"senha\": \"${TEST_PASSWORD}\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} Login successful"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} Login failed"
  exit 1
fi

if curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/api/v1/obras" | grep -q '\['; then
  echo -e "${GREEN}✓${NC} Protected endpoints working"
else
  echo -e "${RED}✗${NC} Protected endpoints failed"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ DEPLOYMENT VERIFICATION COMPLETE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}API:${NC} $API_URL"
echo -e "${BLUE}Web:${NC} https://imobi-web.vercel.app"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. pnpm vercel:env:push  (if API URL or JWT changed)"
echo "2. bash scripts/launch-checklist.sh $API_URL"
echo "3. bash scripts/setup-monitoring.sh $API_URL"
echo "4. Monitor: Render dashboard → imobi-api-staging → Logs"
echo ""
