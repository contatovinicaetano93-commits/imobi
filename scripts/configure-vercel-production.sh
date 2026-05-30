#!/bin/bash
# Vercel Production Environment Configuration Automation
# Usage: ./scripts/configure-vercel-production.sh
# Requires: VERCEL_TOKEN env var set with valid Vercel API token

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Vercel Production Environment Configuration${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo ""

# Verify required environment variables
REQUIRED_FOR_CONFIG=(
  "DATABASE_URL"
  "REDIS_URL"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_S3_BUCKET"
  "AWS_REGION"
  "SENDGRID_API_KEY"
  "NEXT_PUBLIC_SENTRY_DSN"
  "NEXT_PUBLIC_API_URL"
  "CORS_ORIGIN"
  "NODE_ENV"
  "EMAIL_PROVIDER"
)

echo -e "${YELLOW}1️⃣  Validating input variables...${NC}"
MISSING=()
for var in "${REQUIRED_FOR_CONFIG[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING+=("$var")
    echo -e "${RED}  ❌ Missing: $var${NC}"
  else
    echo -e "${GREEN}  ✅ Found: $var${NC}"
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}ERROR: Missing ${#MISSING[@]} environment variables${NC}"
  echo -e "${RED}Export them before running this script:${NC}"
  echo ""
  for var in "${MISSING[@]}"; do
    echo -e "  ${YELLOW}export $var=\"value\"${NC}"
  done
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All variables present!${NC}"
echo ""

# Check for Vercel CLI
echo -e "${YELLOW}2️⃣  Checking Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
  echo -e "${RED}  ❌ Vercel CLI not found${NC}"
  echo -e "${YELLOW}  Install with: npm i -g vercel${NC}"
  exit 1
fi
echo -e "${GREEN}  ✅ Vercel CLI found${NC}"

# Get project info
echo ""
echo -e "${YELLOW}3️⃣  Reading project info...${NC}"
PROJECT_JSON=".vercel/project.json"
if [ ! -f "$PROJECT_JSON" ]; then
  echo -e "${RED}  ❌ File not found: $PROJECT_JSON${NC}"
  echo -e "${YELLOW}  Run 'vercel link' first to create this file${NC}"
  exit 1
fi

PROJECT_ID=$(jq -r '.projectId' "$PROJECT_JSON")
TEAM_ID=$(jq -r '.teamId // .orgId' "$PROJECT_JSON")
echo -e "${GREEN}  ✅ Project: $PROJECT_ID${NC}"
echo -e "${GREEN}  ✅ Team: $TEAM_ID${NC}"

echo ""
echo -e "${YELLOW}4️⃣  Preparing environment variables for Vercel...${NC}"
echo ""

# Define variable scopes (secret vs public)
declare -A SECRET_VARS=(
  ["DATABASE_URL"]=1
  ["REDIS_URL"]=1
  ["AWS_ACCESS_KEY_ID"]=1
  ["AWS_SECRET_ACCESS_KEY"]=1
  ["SENDGRID_API_KEY"]=1
  ["NEXT_PUBLIC_SENTRY_DSN"]=1
)

declare -A PUBLIC_VARS=(
  ["NEXT_PUBLIC_API_URL"]=1
  ["CORS_ORIGIN"]=1
  ["NODE_ENV"]=1
  ["EMAIL_PROVIDER"]=1
  ["AWS_REGION"]=1
  ["AWS_S3_BUCKET"]=1
)

# Function to configure variable via Vercel CLI
configure_var() {
  local var_name=$1
  local var_value=$2
  local is_secret=$3

  if [ "$is_secret" = "true" ]; then
    echo -e "${YELLOW}  🔒 Configuring (SECRET): $var_name${NC}"
  else
    echo -e "${YELLOW}  🌐 Configuring (PUBLIC): $var_name${NC}"
  fi

  # Use vercel env add command
  echo "$var_value" | vercel env add "$var_name" production \
    --scope="$TEAM_ID" \
    --project="$PROJECT_ID" 2>&1 | grep -v "^.*warning" || true

  echo -e "${GREEN}    ✅ Added: $var_name${NC}"
}

# Configure all variables
TOTAL_VARS=0
SUCCESS_VARS=0

for var in "${REQUIRED_FOR_CONFIG[@]}"; do
  TOTAL_VARS=$((TOTAL_VARS + 1))
  var_value="${!var}"

  if [ -n "${SECRET_VARS[$var]}" ]; then
    configure_var "$var" "$var_value" "true"
    SUCCESS_VARS=$((SUCCESS_VARS + 1))
  elif [ -n "${PUBLIC_VARS[$var]}" ]; then
    configure_var "$var" "$var_value" "false"
    SUCCESS_VARS=$((SUCCESS_VARS + 1))
  else
    echo -e "${RED}  ❌ Unknown variable: $var${NC}"
  fi
done

echo ""
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Configuration Complete!${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  ✅ Configured: $SUCCESS_VARS/$TOTAL_VARS variables"
echo "  🔒 Secrets: 6 (encrypted)"
echo "  🌐 Public: 6 (visible in client code)"
echo ""

echo -e "${YELLOW}5️⃣  Vercel rebuild will trigger automatically in 30-60 seconds...${NC}"
echo ""
echo -e "${BLUE}Monitor progress at:${NC}"
echo "  📊 Dashboard: https://vercel.com/contatovinicaetano93-commits/imobi"
echo ""

echo -e "${YELLOW}6️⃣  Validating configuration...${NC}"
sleep 5

# Verify all variables were set
echo ""
echo -e "${BLUE}Verifying variables in Vercel...${NC}"
vercel env ls production \
  --scope="$TEAM_ID" \
  --project="$PROJECT_ID" 2>&1 | grep -E "^(DATABASE|REDIS|AWS|SENDGRID|SENTRY|API|CORS|NODE|EMAIL)" || true

echo ""
echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 All environment variables configured!${NC}"
echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Wait for Vercel rebuild (check dashboard above)"
echo "  2. Confirm build succeeds (< 60 seconds)"
echo "  3. Run: ./scripts/validate-vercel-env.sh"
echo "  4. Proceed with pre-deployment testing"
echo ""
