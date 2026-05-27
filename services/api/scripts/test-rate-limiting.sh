#!/bin/bash

# Test script for rate limiting verification
# Tests IP-based and user-based throttling on critical endpoints

API_URL="${API_URL:-http://localhost:4000/api/v1}"
ITERATIONS=6

echo "================================"
echo "Rate Limiting Test Suite"
echo "================================"
echo "API URL: $API_URL"
echo ""

# Test 1: Login endpoint (5 per 15min per IP)
echo "Test 1: POST /auth/login - IP-based (5 per 15min limit)"
echo "Sending 6 requests (should fail on 6th)..."
for i in {1..6}; do
  echo -n "Request $i: "
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","senha":"password123"}')
  STATUS=$(echo "$RESPONSE" | tail -n1)
  echo "HTTP $STATUS"
  sleep 0.5
done
echo ""

# Test 2: Register endpoint (3 per hour per IP)
echo "Test 2: POST /auth/registrar - IP-based (3 per hour limit)"
echo "Sending 4 requests (should fail on 4th)..."
for i in {1..4}; do
  echo -n "Request $i: "
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/registrar" \
    -H "Content-Type: application/json" \
    -d '{
      "nome":"Test User",
      "email":"newuser'$i'@example.com",
      "senha":"password123",
      "confirmarSenha":"password123"
    }')
  STATUS=$(echo "$RESPONSE" | tail -n1)
  echo "HTTP $STATUS"
  sleep 0.5
done
echo ""

# Test 3: Credit simulation endpoint (20 per hour per user)
echo "Test 3: POST /credito/simular - User-based (20 per hour limit)"
echo "Note: This test requires AUTH TOKEN for proper user tracking"
echo "Sending requests with valid format..."
for i in {1..3}; do
  echo -n "Request $i: "
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/credito/simular" \
    -H "Content-Type: application/json" \
    -d '{
      "idGarante":"550e8400-e29b-41d4-a716-446655440000",
      "idObra":"550e8400-e29b-41d4-a716-446655440001",
      "valor":1000,
      "parcelas":12
    }')
  STATUS=$(echo "$RESPONSE" | tail -n1)
  echo "HTTP $STATUS"
  sleep 0.5
done
echo ""

echo "================================"
echo "Rate Limiting Tests Complete"
echo "Expected Results:"
echo "- 429 Too Many Requests when limits exceeded"
echo "- 400 Bad Request for invalid data (before rate limit check)"
echo "- 401 Unauthorized if auth required without token"
echo "================================"
