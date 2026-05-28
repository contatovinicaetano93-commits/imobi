#!/bin/bash
set -e

echo "🚀 imobi Staging Deployment Script"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
echo -e "\n${YELLOW}[1/8] Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker not found${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js not found${NC}"; exit 1; }
echo -e "${GREEN}✓ Prerequisites OK${NC}"

# Build production artifacts
echo -e "\n${YELLOW}[2/8] Building production artifacts...${NC}"
pnpm build
echo -e "${GREEN}✓ Build complete${NC}"

# Set up environment
echo -e "\n${YELLOW}[3/8] Configuring environment...${NC}"
if [ ! -f .env.staging ]; then
  cp .env.staging.example .env.staging
  echo -e "${RED}⚠ Please configure .env.staging with your infrastructure details${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Start infrastructure
echo -e "\n${YELLOW}[4/8] Starting infrastructure (PostgreSQL + Redis)...${NC}"
docker compose -f docker-compose.staging.yml up -d
sleep 3
echo -e "${GREEN}✓ Infrastructure ready${NC}"

# Run migrations
echo -e "\n${YELLOW}[5/8] Running database migrations...${NC}"
NODE_ENV=staging pnpm db:migrate
echo -e "${GREEN}✓ Database ready${NC}"

# Start services
echo -e "\n${YELLOW}[6/8] Starting services...${NC}"
NODE_ENV=staging timeout 10 pnpm --filter @imbobi/api start:prod &
NODE_ENV=staging timeout 10 pnpm --filter @imbobi/web build && pnpm --filter @imbobi/web start &
sleep 5
echo -e "${GREEN}✓ Services started${NC}"

# Run security validation tests
echo -e "\n${YELLOW}[7/8] Running security validation tests...${NC}"
bash tests/security-validation.sh
echo -e "${GREEN}✓ Security tests passed${NC}"

# Health checks
echo -e "\n${YELLOW}[8/8] Running health checks...${NC}"
curl -s http://localhost:4000/api/v1/health | jq . && echo -e "${GREEN}✓ API healthy${NC}" || echo -e "${RED}✗ API unhealthy${NC}"
curl -s http://localhost:3000/health | jq . && echo -e "${GREEN}✓ Web healthy${NC}" || echo -e "${RED}✗ Web unhealthy${NC}"

echo -e "\n${GREEN}✅ Staging deployment complete!${NC}"
echo -e "\nAccess your staging environment:"
echo "  API:  http://localhost:4000"
echo "  Web:  http://localhost:3000"
