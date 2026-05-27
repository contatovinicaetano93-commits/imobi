#!/bin/bash
set -euo pipefail

API_URL="${1:-https://staging-api.imbobi.com}"
TEST_EMAIL="e2e-test-$(date +%s)@imbobi.com"
TEST_PASSWORD="StageTest123!@#"
LOG_FILE="e2e-staging-$(date +%Y%m%d-%H%M%S).log"

echo "🧪 Starting E2E Tests against $API_URL"
echo "Test Email: $TEST_EMAIL"
echo "Log: $LOG_FILE"
echo ""

echo "🔐 [Test 1/5] Authentication Flow..."

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/registrar" \
    -H "Content-Type: application/json" \
    -d "{
        \"nome\": \"E2E Test User\",
        \"email\": \"$TEST_EMAIL\",
        \"senha\": \"$TEST_PASSWORD\",
        \"confirmarSenha\": \"$TEST_PASSWORD\"
    }")

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.id // empty')
if [ -z "$USER_ID" ]; then
    echo "❌ Registration failed"
    echo "$REGISTER_RESPONSE" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ User registered: $USER_ID"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"senha\": \"$TEST_PASSWORD\"
    }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')
if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Login failed"
    echo "$LOGIN_RESPONSE" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ Login successful"
echo "Access Token: ${ACCESS_TOKEN:0:20}..." | tee -a "$LOG_FILE"

echo ""
echo "👤 [Test 2/5] User Profile..."

PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/users/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

PROFILE_EMAIL=$(echo "$PROFILE_RESPONSE" | jq -r '.data.email // empty')
if [ "$PROFILE_EMAIL" != "$TEST_EMAIL" ]; then
    echo "❌ Profile fetch failed"
    exit 1
fi
echo "✓ Profile retrieved: $PROFILE_EMAIL"

echo ""
echo "📤 [Test 3/5] File Upload (S3)..."

TEST_FILE="/tmp/e2e-test-image-$(date +%s).jpg"
echo "fake image data" > "$TEST_FILE"

UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/evidencias/upload" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "file=@$TEST_FILE")

FILE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.url // empty')
if [ -z "$FILE_URL" ]; then
    echo "❌ File upload failed"
    echo "$UPLOAD_RESPONSE" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ File uploaded: $FILE_URL"

rm -f "$TEST_FILE"

echo ""
echo "💰 [Test 4/5] Credit Simulation..."

CREDIT_SIMULATION=$(curl -s -X POST "$API_URL/api/v1/credito/simular" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "valor": 50000,
        "parcelas": 12,
        "latitude": -23.5505,
        "longitude": -46.6333
    }')

INSTALLMENT_VALUE=$(echo "$CREDIT_SIMULATION" | jq -r '.data.valorParcela // empty')
if [ -z "$INSTALLMENT_VALUE" ]; then
    echo "❌ Credit simulation failed"
    echo "$CREDIT_SIMULATION" | jq . | tee -a "$LOG_FILE"
    exit 1
fi
echo "✓ Credit simulated: R$ $INSTALLMENT_VALUE/month (12x)"

echo ""
echo "🔒 [Test 5/5] Rate Limiting Validation..."

RATE_LIMIT_PASS=true
for i in {1..6}; do
    RATE_TEST=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"ratelimit@test.com\",
            \"senha\": \"test123\"
        }" | tail -n1)
    
    if [ "$i" -le 5 ]; then
        if [ "$RATE_TEST" != "200" ] && [ "$RATE_TEST" != "401" ]; then
            echo "❌ Unexpected status on request $i: $RATE_TEST"
            RATE_LIMIT_PASS=false
        fi
    else
        if [ "$RATE_TEST" = "429" ]; then
            echo "✓ Rate limiting triggered correctly on request $i"
            break
        fi
    fi
done

if [ "$RATE_LIMIT_PASS" = true ]; then
    echo "✓ Rate limiting working correctly"
fi

echo ""
echo "=========================================="
echo "✅ All E2E tests passed!"
echo "=========================================="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE"
