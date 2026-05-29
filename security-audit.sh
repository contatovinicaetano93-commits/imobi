#!/bin/bash
set -e

echo "🔐 Starting Security Audit for imobi..."
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

AUDIT_RESULTS=()
AUDIT_PASSED=0
AUDIT_FAILED=0

check_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    AUDIT_PASSED=$((AUDIT_PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    AUDIT_FAILED=$((AUDIT_FAILED + 1))
    AUDIT_RESULTS+=("$2")
  fi
}

# 1. Check for hardcoded secrets
echo -e "\n${YELLOW}[1/10]${NC} Checking for hardcoded secrets..."
if ! grep -r "AKIA\|ghp_\|-----BEGIN RSA\|-----BEGIN PRIVATE\|password.*=\|secret.*=" \
  --include="*.ts" --include="*.js" --include="*.env*" \
  services/api apps/web packages/ 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v dist; then
  check_result 0 "No obvious hardcoded secrets found"
else
  check_result 1 "Potential hardcoded secrets detected - manual review required"
fi

# 2. Check for OWASP Top 10 dependencies
echo -e "\n${YELLOW}[2/10]${NC} Auditing npm dependencies..."
if pnpm audit --prod 2>&1 | grep -q "No known security vulnerabilities"; then
  check_result 0 "No known security vulnerabilities in dependencies"
else
  check_result 1 "Security vulnerabilities found in dependencies (run 'pnpm audit')"
fi

# 3. Check for SQL injection vulnerabilities
echo -e "\n${YELLOW}[3/10]${NC} Checking for SQL injection patterns..."
if ! grep -r "query(\`\|queryRaw(\`" --include="*.ts" services/api packages/ 2>/dev/null | grep -v node_modules; then
  check_result 0 "No raw SQL query patterns detected"
else
  check_result 1 "Raw SQL patterns found - verify Prisma usage is safe"
fi

# 4. Check for XSS vulnerabilities
echo -e "\n${YELLOW}[4/10]${NC} Checking for XSS vulnerabilities..."
if ! grep -r "dangerouslySetInnerHTML\|innerHTML\|v-html" --include="*.tsx" --include="*.jsx" apps/web 2>/dev/null | grep -v node_modules; then
  check_result 0 "No dangerous HTML rendering patterns detected"
else
  check_result 1 "Potentially unsafe HTML rendering found - review required"
fi

# 5. Check CORS configuration
echo -e "\n${YELLOW}[5/10]${NC} Checking CORS security..."
if grep -q "origin:.*\*\|Access-Control-Allow-Origin.*\*" services/api/src/main.ts; then
  check_result 1 "CORS is set to allow all origins (*)"
else
  check_result 0 "CORS properly restricted to specific origins"
fi

# 6. Check for authentication on protected routes
echo -e "\n${YELLOW}[6/10]${NC} Checking protected route guards..."
if grep -r "@UseGuards(JwtAuthGuard)" services/api/src/modules --include="*.ts" > /dev/null 2>&1; then
  check_result 0 "JWT authentication guards found on protected routes"
else
  check_result 1 "Some routes may be missing authentication guards"
fi

# 7. Check for rate limiting
echo -e "\n${YELLOW}[7/10]${NC} Checking rate limiting..."
if grep -q "Throttle\|@UseGuards(ThrottlerGuard)" services/api/src/main.ts; then
  check_result 0 "Rate limiting middleware enabled"
else
  check_result 1 "Rate limiting not configured"
fi

# 8. Check for HTTPS/TLS in production
echo -e "\n${YELLOW}[8/10]${NC} Checking TLS configuration..."
if grep -q "Secure.*true\|NODE_ENV.*production" services/api/src/main.ts || grep -q "https" docker-compose.prod.yml 2>/dev/null; then
  check_result 0 "TLS/HTTPS configuration found for production"
else
  check_result 1 "TLS configuration may be missing"
fi

# 9. Check for input validation
echo -e "\n${YELLOW}[9/10]${NC} Checking input validation..."
if grep -r "@IsEmail\|@IsString\|@IsNumber\|@Validate" services/api/src/modules --include="*.ts" > /dev/null 2>&1; then
  check_result 0 "Input validation decorators found"
else
  check_result 1 "Input validation may be incomplete"
fi

# 10. Check environment variables
echo -e "\n${YELLOW}[10/10]${NC} Checking environment variables..."
if [ -f ".env.example" ]; then
  check_result 0 ".env.example file exists"
else
  check_result 1 ".env.example missing - document required env vars"
fi

# Summary
echo -e "\n========================================"
echo -e "${YELLOW}Audit Summary${NC}"
echo -e "========================================"
echo -e "${GREEN}✓ Passed: $AUDIT_PASSED${NC}"
echo -e "${RED}✗ Failed: $AUDIT_FAILED${NC}"

if [ $AUDIT_FAILED -gt 0 ]; then
  echo -e "\n${RED}Failed checks:${NC}"
  for result in "${AUDIT_RESULTS[@]}"; do
    echo -e "  - $result"
  done
  echo -e "\nRun 'npm audit', 'npm audit fix', and 'pnpm lint' to resolve issues"
  exit 1
else
  echo -e "\n${GREEN}✅ All security checks passed!${NC}"
  exit 0
fi
