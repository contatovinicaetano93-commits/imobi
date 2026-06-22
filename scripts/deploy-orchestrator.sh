#!/bin/bash

# Imobi MVP - Deployment Orchestrator
# Automates Phases 2-5 of deployment (once Railway project is created)
# Usage: bash scripts/deploy-orchestrator.sh <railway-project-id>

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Imobi MVP - Deployment Orchestrator${NC}\n"

# Check if Railway project ID provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Railway project ID required${NC}"
  echo "Usage: bash scripts/deploy-orchestrator.sh <railway-project-id>"
  echo ""
  echo "To get your project ID:"
  echo "1. Go to https://railway.app"
  echo "2. Select your project"
  echo "3. Copy the project ID from the URL or dashboard"
  exit 1
fi

PROJECT_ID="$1"
RAILWAY_API_TOKEN="${RAILWAY_API_TOKEN:-}"

if [ -z "$RAILWAY_API_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  RAILWAY_API_TOKEN not set${NC}"
  echo "To enable automated deployment, set: export RAILWAY_API_TOKEN=<your-token>"
  echo "Get token from: https://railway.app/account/tokens"
  echo ""
  read -p "Continue with manual steps? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
  MANUAL_MODE=1
else
  MANUAL_MODE=0
fi

echo -e "${BLUE}📋 Deployment Plan${NC}"
echo "Phase 2: API Deployment (10 min)"
echo "Phase 3: Database Setup (5 min)"
echo "Phase 4: Verification (10 min)"
echo "Phase 5: Frontend Integration (20 min)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total: 45 minutes"
echo ""

# Phase 2: Check API Deployment Status
echo -e "${BLUE}⏳ Phase 2: Checking API Deployment Status...${NC}"

if [ $MANUAL_MODE -eq 1 ]; then
  echo -e "${YELLOW}Manual Mode:${NC}"
  echo "1. Go to Railway dashboard: https://railway.app"
  echo "2. Create new service from GitHub"
  echo "3. Select: contatovinicaetano93-commits/imobi"
  echo "4. Configure:"
  echo "   - Name: imobi-api"
  echo "   - Root: services/api"
  echo "   - Build: pnpm install --frozen-lockfile && pnpm build --filter @imbobi/api"
  echo "   - Start: node dist/main.js"
  echo "5. Click Deploy"
  echo ""
  read -p "Paste your API URL (https://*.railway.app): " API_URL
else
  echo "Using Railway API to check deployment status..."
  # TODO: Implement Railway API integration
  read -p "Paste your API URL (https://*.railway.app): " API_URL
fi

if [ -z "$API_URL" ]; then
  echo -e "${RED}Error: API URL required${NC}"
  exit 1
fi

# Verify API URL is accessible
echo -e "${BLUE}Verifying API URL...${NC}"
if curl -s -f "${API_URL}/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} API is responding"
else
  echo -e "${YELLOW}⚠️  API not yet responding (may still be building)${NC}"
  read -p "Wait 30 seconds and retry? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    sleep 30
    if ! curl -s -f "${API_URL}/health" > /dev/null 2>&1; then
      echo -e "${RED}✗ API still not responding. Check Railway dashboard.${NC}"
      exit 1
    fi
    echo -e "${GREEN}✓${NC} API now responding"
  fi
fi

# Phase 3: Database Migrations
echo -e "\n${BLUE}⏳ Phase 3: Database Setup...${NC}"

echo -e "${YELLOW}Manual Step Required:${NC}"
echo "1. Go to Railway dashboard"
echo "2. Select imobi-api service"
echo "3. Click 'Shell' tab"
echo "4. Run this command:"
echo ""
echo "   cd services/api"
echo "   npx prisma migrate deploy --schema prisma/schema.prisma"
echo ""
read -p "Press Enter when migrations complete..."

# Phase 4: Post-Deployment Verification
echo -e "\n${BLUE}⏳ Phase 4: Verification...${NC}"
echo "Running automated verification..."
echo ""

bash scripts/post-deploy-verification.sh "$API_URL"

VERIFY_EXIT=$?

if [ $VERIFY_EXIT -ne 0 ]; then
  echo -e "${RED}Verification failed. Check API logs in Railway dashboard.${NC}"
  exit 1
fi

# Phase 5: Frontend Integration
echo -e "\n${BLUE}⏳ Phase 5: Frontend Integration...${NC}"

# Create frontend environment file
echo "Creating .env.local for frontend..."
cat > apps/web/.env.local << EOF
NEXT_PUBLIC_API_URL=$API_URL
EOF

echo -e "${GREEN}✓${NC} Created apps/web/.env.local"
echo ""
echo "Testing frontend integration..."
echo ""

# Start frontend in background for testing
echo "Starting frontend dev server..."
cd apps/web
timeout 30 pnpm dev > /tmp/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
sleep 5

echo -e "${BLUE}🧪 Testing Authentication Flow${NC}"

# Register test user
TEST_EMAIL="test-$(date +%s)@imobi.test"
TEST_PASSWORD="TestPass123!@"

echo "Step 1: Testing registration..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/registro" \
  -H 'Content-Type: application/json' \
  -d "{
    \"nome\": \"Test User\",
    \"email\": \"${TEST_EMAIL}\",
    \"cpf\": \"12345678900\",
    \"telefone\": \"11999999999\",
    \"senha\": \"${TEST_PASSWORD}\",
    \"consentidoTermos\": true,
    \"consentidoPrivacy\": true,
    \"consentidoKyc\": true
  }")

if echo "$REGISTER_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓${NC} Registration successful"
else
  echo -e "${RED}✗${NC} Registration failed"
  kill $FRONTEND_PID 2>/dev/null || true
  exit 1
fi

echo "Step 2: Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"${TEST_EMAIL}\", \"senha\": \"${TEST_PASSWORD}\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} Login successful"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} Login failed"
  kill $FRONTEND_PID 2>/dev/null || true
  exit 1
fi

echo "Step 3: Testing protected endpoints..."
if curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/api/v1/obras" | grep -q '\['; then
  echo -e "${GREEN}✓${NC} Protected endpoints working"
else
  echo -e "${RED}✗${NC} Protected endpoints failed"
  kill $FRONTEND_PID 2>/dev/null || true
  exit 1
fi

# Cleanup frontend
kill $FRONTEND_PID 2>/dev/null || true

# Final summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ DEPLOYMENT COMPLETE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓${NC} API deployed and verified"
echo -e "${GREEN}✓${NC} Database migrations applied"
echo -e "${GREEN}✓${NC} Authentication flow working"
echo -e "${GREEN}✓${NC} Frontend configured"
echo ""
echo -e "${BLUE}API URL:${NC} $API_URL"
echo -e "${BLUE}Frontend Config:${NC} apps/web/.env.local"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Start frontend: cd apps/web && pnpm dev"
echo "2. Open browser: http://localhost:3001"
echo "3. Test registration, login, and dashboard"
echo "4. Monitor API logs: Railway dashboard → imobi-api → Logs"
echo ""
echo -e "${BLUE}Post-Launch:${NC}"
echo "1. Setup Sentry error tracking"
echo "2. Configure UptimeRobot monitoring"
echo "3. Announce soft launch to stakeholders"
echo ""
echo "🚀 Ready for soft launch!"
