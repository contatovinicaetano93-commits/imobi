#!/bin/sh
# Security validation before/after deploy.
# Usage: API_URL=https://api.seudominio.com.br WEB_URL=https://seudominio.com.br sh scripts/validate-security.sh

API_URL="${API_URL:-https://api.imbobi.com.br}"
WEB_URL="${WEB_URL:-https://imbobi.com.br}"
ERRORS=0

ok()   { printf "  OK  %s\n" "$1"; }
fail() { printf "  FAIL %s\n" "$1"; ERRORS=$((ERRORS + 1)); }
info() { printf "\n=== %s ===\n" "$1"; }

# ── 1. HTTPS ──────────────────────────────────────────
info "HTTPS"
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/health" 2>/dev/null)
if [ "$CODE" = "200" ]; then ok "API HTTPS $API_URL/health → $CODE"
else fail "API HTTPS $API_URL/health → $CODE (esperado 200)"; fi

CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$WEB_URL" 2>/dev/null)
if [ "$CODE" = "200" ] || [ "$CODE" = "308" ]; then ok "Web HTTPS $WEB_URL → $CODE"
else fail "Web HTTPS $WEB_URL → $CODE"; fi

# HTTP → HTTPS redirect
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${API_URL/https/http}" 2>/dev/null)
if [ "$CODE" = "301" ] || [ "$CODE" = "308" ] || [ "$CODE" = "302" ]; then ok "HTTP redirect → HTTPS ($CODE)"
else fail "HTTP não redireciona para HTTPS (got $CODE)"; fi

# ── 2. CORS ───────────────────────────────────────────
info "CORS"
CORS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS "$API_URL/auth/login" 2>/dev/null)
if [ "$CORS" = "403" ] || [ "$CORS" = "204" ]; then
  # 403 = blocked, 204 = allowed — check header
  ALLOW=$(curl -s -I --max-time 10 \
    -H "Origin: https://evil.com" \
    "$API_URL/health" 2>/dev/null | grep -i "access-control-allow-origin")
  if echo "$ALLOW" | grep -q "evil.com"; then
    fail "CORS permite origem não autorizada: $ALLOW"
  else
    ok "CORS bloqueia origens não autorizadas"
  fi
else
  ok "CORS OPTIONS → $CORS"
fi

# ── 3. Rate limiting ──────────────────────────────────
info "Rate Limiting"
LAST_CODE=200
for i in $(seq 1 12); do
  LAST_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","senha":"wrong"}' 2>/dev/null)
done
if [ "$LAST_CODE" = "429" ]; then ok "Rate limit ativo (429 após 12 tentativas)"
else fail "Rate limit não disparou após 12 tentativas (último: $LAST_CODE)"; fi

# ── 4. Security headers ───────────────────────────────
info "Security Headers"
HEADERS=$(curl -s -I --max-time 10 "$WEB_URL" 2>/dev/null)
for H in "x-content-type-options" "x-frame-options" "strict-transport-security"; do
  if echo "$HEADERS" | grep -qi "$H"; then ok "Header $H presente"
  else fail "Header $H ausente"; fi
done

# ── Resultado ─────────────────────────────────────────
printf "\n"
if [ "$ERRORS" -eq 0 ]; then
  echo "PASSOU: todas as verificações de segurança OK."
  exit 0
else
  echo "FALHOU: $ERRORS verificação(ões) com problema. Corrija antes do go-live."
  exit 1
fi
