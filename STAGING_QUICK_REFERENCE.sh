#!/bin/bash

################################################################################
# IMBOBI STAGING DEPLOYMENT - QUICK REFERENCE COMMANDS
# Copy and paste these commands directly into your terminal
# Last Updated: 2026-05-27
################################################################################

# Color codes for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

################################################################################
# 1. ENVIRONMENT SETUP
################################################################################

echo -e "${BLUE}=== 1. ENVIRONMENT SETUP ===${NC}"
echo ""

# Generate secure keys for .env.staging
echo "🔐 Generating secure keys (copy these to .env.staging):"
echo ""

echo "# JWT_SECRET (64 chars) - Paste in .env.staging:"
openssl rand -base64 32
echo ""

echo "# JWT_REFRESH_SECRET (64 chars) - Paste in .env.staging:"
openssl rand -base64 32
echo ""

echo "# ENCRYPTION_SECRET (32 chars) - Paste in .env.staging:"
openssl rand -base64 32
echo ""

echo "Copy the above values to .env.staging in project root"
echo "DO NOT COMMIT THIS FILE"
echo ""

################################################################################
# 2. VALIDATE ENVIRONMENT
################################################################################

echo -e "${BLUE}=== 2. VALIDATE ENVIRONMENT ===${NC}"
echo ""

echo "To validate your .env.staging configuration, run:"
echo ""
echo "# AWS S3"
echo "aws s3 ls s3://imbobi-staging-evidencias --profile staging"
echo ""
echo "# PostgreSQL"
echo "psql \"postgresql://imbobi_staging:PASSWORD@staging-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/imbobi_staging\" -c \"SELECT version();\""
echo ""
echo "# Redis"
echo "redis-cli -h staging-redis.c9akciq32.us-east-1.cache.amazonaws.com ping"
echo ""
echo "# SendGrid"
echo "curl -s https://api.sendgrid.com/v3/mail/validate -X POST -H \"Authorization: Bearer \$SENDGRID_API_KEY\" -H \"Content-Type: application/json\" -d '{\"email\": \"test@imbobi.com\"}' | jq '.is_valid_email'"
echo ""

################################################################################
# 3. FIRST TIME SETUP
################################################################################

echo -e "${BLUE}=== 3. FIRST TIME SETUP ===${NC}"
echo ""
echo "Run this ONCE when setting up staging:"
echo ""
echo "bash scripts/staging-init.sh"
echo ""
echo "This validates:"
echo "  ✓ AWS S3 bucket"
echo "  ✓ RDS PostgreSQL + PostGIS"
echo "  ✓ ElastiCache Redis"
echo "  ✓ Firebase project"
echo "  ✓ SendGrid API"
echo "  ✓ GitHub secrets"
echo ""

################################################################################
# 4. DEPLOY & VALIDATE
################################################################################

echo -e "${BLUE}=== 4. DEPLOY & VALIDATE ===${NC}"
echo ""
echo "Complete deployment pipeline:"
echo ""
echo "bash scripts/staging-deploy.sh"
echo ""
echo "This runs:"
echo "  1. Type checking & build"
echo "  2. Database migrations (with backup)"
echo "  3. Docker container deployment"
echo "  4. Health checks"
echo ""

################################################################################
# 5. HEALTH CHECKS
################################################################################

echo -e "${BLUE}=== 5. HEALTH CHECKS ===${NC}"
echo ""
echo "Manual health check (run anytime):"
echo ""
echo "bash scripts/staging-health-check.sh https://staging-api.imbobi.com"
echo ""
echo "Individual service checks:"
echo ""
echo "# API Health"
echo "curl -s https://staging-api.imbobi.com/api/v1/health | jq ."
echo ""
echo "# Database"
echo "curl -s https://staging-api.imbobi.com/api/v1/health/database | jq ."
echo ""
echo "# Redis"
echo "curl -s https://staging-api.imbobi.com/api/v1/health/redis | jq ."
echo ""
echo "# Email Service"
echo "curl -s https://staging-api.imbobi.com/api/v1/health/email | jq ."
echo ""
echo "# Firebase"
echo "curl -s https://staging-api.imbobi.com/api/v1/health/firebase | jq ."
echo ""
echo "# S3 Storage"
echo "curl -s https://staging-api.imbobi.com/api/v1/health/s3 | jq ."
echo ""

################################################################################
# 6. E2E TESTS
################################################################################

echo -e "${BLUE}=== 6. E2E TESTS ===${NC}"
echo ""
echo "Run complete E2E test suite:"
echo ""
echo "bash scripts/staging-e2e.sh https://staging-api.imbobi.com"
echo ""
echo "Tests:"
echo "  ✓ Authentication (register + login)"
echo "  ✓ User profile retrieval"
echo "  ✓ File upload to S3"
echo "  ✓ Credit simulation (GPS validation)"
echo "  ✓ Rate limiting"
echo ""

################################################################################
# 7. MONITORING & LOGS
################################################################################

echo -e "${BLUE}=== 7. MONITORING & LOGS ===${NC}"
echo ""
echo "View live API logs:"
echo ""
echo "docker logs -f imbobi-api-staging"
echo ""
echo "Last 100 lines:"
echo ""
echo "docker logs imbobi-api-staging | tail -100"
echo ""
echo "Search for errors:"
echo ""
echo "docker logs imbobi-api-staging 2>&1 | grep -i error"
echo ""
echo "Database monitoring:"
echo ""
echo "psql \$DATABASE_URL -c \"SELECT count(*) FROM pg_stat_activity;\""
echo ""
echo "Redis monitoring:"
echo ""
echo "redis-cli -h staging-redis.c9akciq32.us-east-1.cache.amazonaws.com INFO"
echo ""

################################################################################
# 8. ROLLBACK
################################################################################

echo -e "${BLUE}=== 8. ROLLBACK PROCEDURES ===${NC}"
echo ""
echo "Automated rollback:"
echo ""
echo "bash scripts/staging-rollback.sh"
echo ""
echo "Manual rollback steps:"
echo ""
echo "# 1. Stop current container"
echo "docker stop imbobi-api-staging"
echo "docker rm imbobi-api-staging"
echo ""
echo "# 2. View previous versions"
echo "docker images --filter \"reference=imbobi-api:staging*\" --format \"table {{.Tag}}\\t{{.CreatedAt}}\""
echo ""
echo "# 3. Revert database migration (if needed)"
echo "cd services/api"
echo "DATABASE_URL=\"postgresql://...\" pnpm prisma migrate status"
echo "DATABASE_URL=\"postgresql://...\" pnpm prisma migrate resolve --rolled-back <migration-name>"
echo ""
echo "# 4. Start previous version"
echo "docker run -d \\"
echo "  --name imbobi-api-staging \\"
echo "  --restart unless-stopped \\"
echo "  -p 4000:4000 \\"
echo "  --env-file .env.staging \\"
echo "  --network imbobi_network \\"
echo "  imbobi-api:staging-<previous-git-sha>"
echo ""
echo "# 5. Verify"
echo "curl -f https://staging-api.imbobi.com/api/v1/health"
echo ""

################################################################################
# 9. EMERGENCY STOP
################################################################################

echo -e "${BLUE}=== 9. EMERGENCY STOP ===${NC}"
echo ""
echo "Stop all services immediately:"
echo ""
echo "docker stop imbobi-api-staging imbobi-postgres-staging imbobi-redis-staging"
echo ""
echo "View last errors:"
echo ""
echo "docker logs imbobi-api-staging | tail -100"
echo ""

################################################################################
# 10. PRE-DEPLOYMENT CHECKLIST
################################################################################

echo -e "${BLUE}=== 10. PRE-DEPLOYMENT CHECKLIST ===${NC}"
echo ""
echo "Before deploying, run:"
echo ""
echo "# Type check"
echo "pnpm type-check"
echo ""
echo "# Build"
echo "pnpm build"
echo ""
echo "# Tests"
echo "pnpm test"
echo ""
echo "# Git status"
echo "git status"
echo ""
echo "# Latest commits"
echo "git log --oneline -n 5"
echo ""

################################################################################
# 11. DEPLOYMENT WORKFLOW
################################################################################

echo -e "${BLUE}=== 11. COMPLETE DEPLOYMENT WORKFLOW ===${NC}"
echo ""
echo "Step-by-step deployment:"
echo ""
echo "1. Pull latest code:"
echo "   git pull origin main"
echo ""
echo "2. Setup (first time only):"
echo "   bash scripts/staging-init.sh"
echo ""
echo "3. Deploy:"
echo "   bash scripts/staging-deploy.sh"
echo ""
echo "4. Verify health:"
echo "   bash scripts/staging-health-check.sh https://staging-api.imbobi.com"
echo ""
echo "5. Run E2E tests:"
echo "   bash scripts/staging-e2e.sh https://staging-api.imbobi.com"
echo ""
echo "6. Manual testing:"
echo "   Open https://staging-app.imbobi.com in browser"
echo ""
echo "7. Monitor logs (30 minutes):"
echo "   docker logs -f imbobi-api-staging"
echo ""
echo "8. Notify team:"
echo "   Post in Slack #imbobi-deployments"
echo ""

################################################################################
# 12. ENVIRONMENT FILE TEMPLATE
################################################################################

echo -e "${BLUE}=== 12. .env.staging TEMPLATE ===${NC}"
echo ""
echo "Create .env.staging with these variables:"
echo ""
cat << 'EOF'
# CORE API
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=https://staging-app.imbobi.com,https://staging.imbobi.com
LOG_LEVEL=debug

# DATABASE
DATABASE_URL=postgresql://imbobi_staging:PASSWORD@staging-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/imbobi_staging

# CACHE & QUEUE
REDIS_HOST=staging-redis.c9akciq32.us-east-1.cache.amazonaws.com
REDIS_PORT=6379

# SECURITY (Generate with: openssl rand -base64 32)
JWT_SECRET=<64-chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<64-chars>
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_SECRET=<32-chars>

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<staging-key>
AWS_SECRET_ACCESS_KEY=<staging-secret>
S3_BUCKET=imbobi-staging-evidencias

# EMAIL
SENDGRID_API_KEY=<sendgrid-key>
SMTP_FROM=noreply-staging@imbobi.com
APP_URL=https://staging-app.imbobi.com

# FIREBASE
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY=<json-key>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@imbobi-staging.iam.gserviceaccount.com

# EXTERNAL APIS
UNICO_API_KEY=<unico-key>
SERPRO_TOKEN=<serpro-token>

# FRONTEND
NEXT_PUBLIC_API_URL=https://staging-api.imbobi.com
EXPO_PUBLIC_API_URL=https://staging-api.imbobi.com
EOF
echo ""
echo "⚠️  DO NOT COMMIT .env.staging - it contains secrets"
echo ""

################################################################################
# 13. TROUBLESHOOTING
################################################################################

echo -e "${BLUE}=== 13. TROUBLESHOOTING ===${NC}"
echo ""
echo "API not responding:"
echo "  1. docker logs imbobi-api-staging | tail -50"
echo "  2. Check database: psql \$DATABASE_URL -c \"SELECT 1;\""
echo "  3. Check Redis: redis-cli ping"
echo "  4. Rollback: bash scripts/staging-rollback.sh"
echo ""
echo "Database connection errors:"
echo "  1. Verify DATABASE_URL in .env.staging"
echo "  2. Check RDS security group allows your IP"
echo "  3. Check database size: df -h (RDS console)"
echo ""
echo "Email service down:"
echo "  1. Verify SENDGRID_API_KEY"
echo "  2. Test: curl -s https://staging-api.imbobi.com/api/v1/health/email"
echo ""
echo "Firebase push notifications failing:"
echo "  1. Verify FIREBASE_PROJECT_ID and FIREBASE_PRIVATE_KEY"
echo "  2. Test: curl -s https://staging-api.imbobi.com/api/v1/health/firebase"
echo ""

################################################################################
# 14. HELPFUL LINKS
################################################################################

echo -e "${BLUE}=== 14. DOCUMENTATION ===${NC}"
echo ""
echo "Detailed guides:"
echo "  • STAGING_DEPLOYMENT_PLAN.md - Complete technical plan"
echo "  • STAGING_EXECUTION_GUIDE.md - Step-by-step execution"
echo "  • DEPLOYMENT.md - General deployment guide"
echo ""
echo "Scripts location: /home/user/alagami-site/scripts/"
echo "  • staging-init.sh"
echo "  • staging-deploy.sh"
echo "  • staging-health-check.sh"
echo "  • staging-e2e.sh"
echo "  • staging-rollback.sh"
echo ""

################################################################################
# SUMMARY
################################################################################

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}STAGING DEPLOYMENT - READY TO GO${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Create .env.staging with your credentials"
echo "  2. Run: bash scripts/staging-init.sh"
echo "  3. Run: bash scripts/staging-deploy.sh"
echo "  4. Monitor: bash scripts/staging-health-check.sh"
echo ""
echo "For detailed instructions, see:"
echo "  • STAGING_EXECUTION_GUIDE.md"
echo "  • STAGING_DEPLOYMENT_PLAN.md"
echo ""
echo "Questions? Check Slack #imbobi-deployments"
echo ""
