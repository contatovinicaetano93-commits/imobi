#!/bin/bash
set -e

echo "🧪 Smoke Tests — Production Cutover STEP 4"
echo "==========================================="
echo ""

# Configuration
API_BASE_URL="${API_BASE_URL:-https://api.imobi.com.br}"
WEB_BASE_URL="${WEB_BASE_URL:-https://app.imobi.com.br}"
JWT_TOKEN="${JWT_TOKEN}" # Must be set by user before running

if [ -z "$JWT_TOKEN" ]; then
  echo "❌ ERROR: JWT_TOKEN environment variable not set"
  echo "   Example: export JWT_TOKEN='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'"
  exit 1
fi

echo "API Base: $API_BASE_URL"
echo "Web Base: $WEB_BASE_URL"
echo ""

# ============================================================================
# TC-020: Approve Without Evidence (Expected: 400 "Etapa precisa ter...")
# ============================================================================
echo "🧪 TC-020: Approve etapa without evidence"
echo "Expected: 400 with 'Etapa precisa ter ao menos uma evidência validada'"
echo ""

RESPONSE=$(curl -s -X PATCH "$API_BASE_URL/api/v1/manager/etapas/test-id/approve" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  if echo "$BODY" | grep -q "Etapa precisa ter ao menos uma evidência validada"; then
    echo "✅ TC-020: PASSED (400 with correct message)"
  else
    echo "⚠️  TC-020: Got 400 but unexpected message: $BODY"
  fi
else
  echo "❌ TC-020: FAILED (got $HTTP_CODE, expected 400)"
  echo "Response: $BODY"
fi
echo ""

# ============================================================================
# TC-033: GPS Validation (Expected: 400 "GPS inválido")
# ============================================================================
echo "🧪 TC-033: GPS validation with invalid coordinates"
echo "Expected: 400 with 'GPS inválido'"
echo ""

RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/v1/obras" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test Obra",
    "tipo": "house",
    "geo": {
      "latitude": 0.0,
      "longitude": 0.0
    }
  }' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  if echo "$BODY" | grep -q "GPS"; then
    echo "✅ TC-033: PASSED (400 with GPS error)"
  else
    echo "⚠️  TC-033: Got 400 but unexpected message: $BODY"
  fi
else
  echo "❌ TC-033: FAILED (got $HTTP_CODE, expected 400)"
  echo "Response: $BODY"
fi
echo ""

# ============================================================================
# TC-028: KYC Approval Email (Expected: 200 + email sent)
# ============================================================================
echo "🧪 TC-028: KYC approval with email notification"
echo "Expected: 200 with email sent"
echo ""

RESPONSE=$(curl -s -X PATCH "$API_BASE_URL/api/v1/kyc/test-doc/approve" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ TC-028: PASSED (200 OK)"
  echo "   ℹ️  Verify email was sent to user inbox (check SendGrid logs)"
else
  echo "❌ TC-028: FAILED (got $HTTP_CODE, expected 200)"
  echo "Response: $BODY"
fi
echo ""

# ============================================================================
# Health Checks
# ============================================================================
echo "🏥 Health Checks"
echo "---"

HEALTH=$(curl -s "$API_BASE_URL/health" | jq . 2>/dev/null || echo "Failed to parse")
echo "API Health: $HEALTH"

WEB_HEALTH=$(curl -s "$WEB_BASE_URL/api/health" | jq . 2>/dev/null || echo "Failed to parse")
echo "Web Health: $WEB_HEALTH"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "✅ Smoke Tests Complete"
echo "==========================================="
echo "Next: Begin 4-hour production monitoring"
echo "   - Monitor Sentry for errors"
echo "   - Check CloudWatch latency (target <2s p95)"
echo "   - Monitor database connection pool (<80%)"
echo "   - Monitor Redis memory (<70%)"
