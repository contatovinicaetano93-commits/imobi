# Quick Reference: Running E2E Validation

**TL;DR**: Copy-paste commands to validate production API.

---

## One-Minute Setup

```bash
# 1. Make script executable
chmod +x PRODUCTION_E2E_VALIDATION_SCRIPT.sh

# 2. Run against your API
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com

# 3. Check final report for PASS/FAIL
```

---

## Common Scenarios

### Scenario 1: Validate Production After Deployment

```bash
# Basic validation (< 30 minutes)
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com

# Expected: "✓ ALL VALIDATIONS PASSED - PRODUCTION READY"
```

### Scenario 2: Validate Local Development

```bash
# Start services first
docker-compose -f services/api/docker-compose.test.yml up -d

# Run validation
./PRODUCTION_E2E_VALIDATION_SCRIPT.sh http://localhost:4000

# Cleanup
docker-compose -f services/api/docker-compose.test.yml down
```

### Scenario 3: Detailed Debugging

```bash
# Run with verbose output and keep test data
CLEANUP=false VERBOSE=true \
  ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com
```

### Scenario 4: Continuous Monitoring (Cron Job)

```bash
# Add to crontab (run daily at 6 AM)
0 6 * * * /home/user/imobi/PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com >> /var/log/e2e-validation.log 2>&1
```

### Scenario 5: CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/e2e-validation.yml
name: Post-Deploy E2E Validation

on:
  workflow_run:
    workflows: ["Deploy"]
    types: [completed]

jobs:
  e2e-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run E2E Validation
        run: |
          chmod +x PRODUCTION_E2E_VALIDATION_SCRIPT.sh
          ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh ${{ secrets.PRODUCTION_API_URL }}
        
      - name: Report Results
        if: always()
        run: echo "E2E validation complete. Check logs."
```

---

## Understanding the Output

### Success Example

```
═══════════════════════════════════════════════════════════
IMOBI PRODUCTION E2E VALIDATION
═══════════════════════════════════════════════════════════

[PASS] ✓ Health Endpoint Responds
[PASS] ✓ Redis Connected
[PASS] ✓ Database Configured
[PASS] ✓ User Registration
[PASS] ✓ User Login
[PASS] ✓ Token Validation
...
[FINAL REPORT]
  Passed: 54/54
  Failed: 0
  Pass Rate: 100%

✓ ALL VALIDATIONS PASSED - PRODUCTION READY
```

### Failure Example

```
[FAIL] ✗ Health Endpoint Responds
  Expected: 200
  Got: 000 (Connection refused)

[FINAL REPORT]
  Passed: 0/54
  Failed: 54
  Pass Rate: 0%

✗ VALIDATIONS FAILED - DO NOT DEPLOY
```

---

## Environment Variables

### Required
None - Script auto-detects from arguments

### Optional
```bash
# Enable verbose logging
export VERBOSE=true

# Skip cleanup (keep test accounts for inspection)
export CLEANUP=false

# Custom timeout (in seconds)
export TIMEOUT=60
```

---

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | ✓ All tests passed | DEPLOY |
| 1 | ✗ Tests failed | INVESTIGATE |
| 2 | ⚠ Warnings only | REVIEW |
| 126 | Script not executable | `chmod +x` script |
| 127 | Command not found | Check `curl` installed |

---

## Interpreting Results

### PASS Scenarios

**✓ GREEN - GO**
```
Total Tests: 54
Passed: 54
Failed: 0
Pass Rate: 100%
→ PRODUCTION READY
```

**✓ GREEN with WARNINGS**
```
Total Tests: 54
Passed: 52
Failed: 2 (non-critical)
Pass Rate: 96%
→ PRODUCTION READY (monitor warnings)
```

### FAIL Scenarios

**⚠ YELLOW - HOLD**
```
Total Tests: 54
Passed: 51
Failed: 3 (non-critical)
Pass Rate: 94%
→ REVIEW FAILURES BEFORE DEPLOYING
```

**✗ RED - NO-GO**
```
Total Tests: 54
Passed: 48
Failed: 6 (1+ critical)
Pass Rate: 88%
→ DO NOT DEPLOY
```

---

## Quick Troubleshooting

### "API is not reachable"

```bash
# Check if API is running
curl https://api.imobi.com/api/v1/health

# If connection refused:
# 1. API server not started
# 2. Wrong URL
# 3. Firewall blocking
```

### "Health check failed"

```bash
# Check logs
curl https://api.imobi.com/api/v1/health | jq .

# Look for:
# - redis.status: should be "connected"
# - database.configured: should be true
```

### "Registration fails"

```bash
# Check database migrations
cd services/api
npx prisma migrate status

# If migrations pending:
npx prisma migrate deploy
```

### "Tests timeout"

```bash
# Run single phase to isolate
# Edit script: comment out other phases
# Or check response times:
time curl https://api.imobi.com/api/v1/health
```

---

## Manual Testing (No Script)

If you want to manually verify key endpoints:

```bash
# Phase 1: Health Check
curl https://api.imobi.com/api/v1/health | jq .

# Phase 2: Register
curl -X POST https://api.imobi.com/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test-'$(date +%s)'@imbobi.test",
    "password":"TempPassword123!",
    "nome":"Test User"
  }' | jq .

# Phase 2: Login (use email from registration)
curl -X POST https://api.imobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@imbobi.test",
    "password":"TempPassword123!"
  }' | jq .

# Phase 3: List Obras (use token from login)
curl https://api.imobi.com/api/v1/obras \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" | jq .

# Phase 4: Manager Dashboard
curl https://api.imobi.com/api/v1/manager/dashboard \
  -H "Authorization: Bearer MANAGER_TOKEN_HERE" | jq .

# Phase 5: Performance (10 requests)
for i in {1..10}; do
  time curl -s https://api.imobi.com/api/v1/obras \
    -H "Authorization: Bearer YOUR_TOKEN_HERE" > /dev/null
done
```

---

## Documentation Map

| Document | Purpose | Read When |
|----------|---------|-----------|
| `PRODUCTION_E2E_VALIDATION_SCRIPT.sh` | Main test script | Running tests |
| `E2E_VALIDATION_GUIDE.md` | Complete guide | Understanding phases |
| `E2E_ASSERTIONS_AND_RESULTS.md` | Expected responses | Debugging failures |
| `RUN_E2E_VALIDATION.md` | Quick reference | ← YOU ARE HERE |
| `services/api/PRODUCTION_VALIDATION.md` | Config reference | Setting up services |
| `services/api/E2E_TEST_GUIDE.md` | Jest tests | Running unit tests |

---

## Key Contacts

**Questions?**
- Email: contato.vinicaetano93@gmail.com
- Slack: #tech-ops

**Found a bug?**
- Create issue in GitHub
- Include: Error message, API URL, timestamp

---

## Test Accounts (Created & Cleaned Up)

During validation, temporary test accounts are created:

```
Constructor: constructor-e2e-{TIMESTAMP}@imbobi.test
Manager: manager-e2e-{TIMESTAMP}@imbobi.test
```

These are **automatically deleted** after tests complete (unless `CLEANUP=false`).

---

## Success Metrics Summary

| Phase | Time | Tests | Pass Threshold |
|-------|------|-------|-----------------|
| 1: Health | 5 min | 4 | 100% |
| 2: Auth | 5 min | 10 | 100% |
| 3: Features | 8 min | 15 | 95% |
| 4: Manager | 5 min | 8 | 95% |
| 5: Performance | 7 min | 17 | 90% |
| **TOTAL** | **30 min** | **54** | **≥95%** |

---

## One-Page Checklist

```bash
Pre-Validation:
  ☐ API server running
  ☐ Database connected
  ☐ Redis connected
  ☐ curl installed

Run Validation:
  ☐ chmod +x PRODUCTION_E2E_VALIDATION_SCRIPT.sh
  ☐ ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com
  ☐ Wait 30 minutes for all phases

Review Results:
  ☐ Check final report
  ☐ Look for ✓ or ✗ status
  ☐ Note any warnings (⚠)

Decision:
  ☐ GREEN (pass rate ≥ 95%) → DEPLOY
  ☐ YELLOW (warnings only) → REVIEW & DEPLOY
  ☐ RED (failures) → INVESTIGATE & FIX
```

---

## Next Steps

1. **First Time?** Read `E2E_VALIDATION_GUIDE.md` for complete context
2. **Running Now?** Execute script and monitor output
3. **Debugging?** Check `E2E_ASSERTIONS_AND_RESULTS.md` for expected responses
4. **Setting Up CI/CD?** See GitHub Actions example above

---

**Version**: 1.0  
**Last Updated**: 2026-06-22  
**Status**: Ready for production use
