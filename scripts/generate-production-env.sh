#!/usr/bin/env bash
# ============================================================
# IMOBI — Gerador de variáveis de ambiente para produção
# Rode: chmod +x scripts/generate-production-env.sh && ./scripts/generate-production-env.sh
# O arquivo .env.production gerado NÃO deve ser commitado no git.
# ============================================================
set -euo pipefail

OUTPUT=".env.production"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     IMOBI — Setup de Variáveis de Produção          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Helpers ─────────────────────────────────────────────────
ask() {
  local prompt="$1" default="${2:-}" var
  if [ -n "$default" ]; then
    read -rp "  $prompt [$default]: " var
    echo "${var:-$default}"
  else
    read -rp "  $prompt: " var
    echo "$var"
  fi
}

section() { echo ""; echo "── $1 ──────────────────────────────────"; }

# ── Gera segredos automaticamente ───────────────────────────
section "Gerando secrets automáticos"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
SETUP_SECRET=$(openssl rand -hex 24)
echo "  ✅ JWT_SECRET gerado (64 bytes)"
echo "  ✅ SETUP_SECRET gerado: $SETUP_SECRET  ← guarde este valor"

# ── Coleta dados interativos ─────────────────────────────────
section "Banco de dados PostgreSQL (Render / Neon / Supabase)"
DATABASE_URL=$(ask "DATABASE_URL (postgresql://user:pass@host:5432/db)")

section "Redis (Upstash ou Render Redis)"
REDIS_URL=$(ask "REDIS_URL (redis://default:pass@host:6379)")

section "CORS — domínio do frontend"
CORS_ORIGIN=$(ask "CORS_ORIGIN (ex: https://imobi.com.br,https://www.imobi.com.br)")

section "URL pública da aplicação web"
APP_URL=$(ask "APP_URL" "https://imobi.com.br")

section "Email (SendGrid recomendado)"
echo "  Opções: sendgrid | ses | smtp"
EMAIL_PROVIDER=$(ask "EMAIL_PROVIDER" "sendgrid")
if [ "$EMAIL_PROVIDER" = "sendgrid" ]; then
  SENDGRID_API_KEY=$(ask "SENDGRID_API_KEY (começa com SG.)")
else
  SMTP_HOST=$(ask "SMTP_HOST")
  SMTP_PORT=$(ask "SMTP_PORT" "587")
  SMTP_USER=$(ask "SMTP_USER")
  SMTP_PASS=$(ask "SMTP_PASS")
fi
SMTP_FROM=$(ask "SMTP_FROM (remetente)" "noreply@imobi.com.br")

section "AWS S3 (fotos de obra)"
AWS_S3_BUCKET=$(ask "AWS_S3_BUCKET" "imobi-evidencias-prod")
AWS_S3_REGION=$(ask "AWS_S3_REGION" "us-east-1")
AWS_ACCESS_KEY_ID=$(ask "AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY=$(ask "AWS_SECRET_ACCESS_KEY")

section "Firebase (notificações push)"
FIREBASE_PROJECT_ID=$(ask "FIREBASE_PROJECT_ID")
FIREBASE_CLIENT_EMAIL=$(ask "FIREBASE_CLIENT_EMAIL (firebase-adminsdk-xxx@projeto.iam...)")
echo "  Cole a FIREBASE_PRIVATE_KEY (pressione Enter duas vezes para terminar):"
FIREBASE_PRIVATE_KEY=""
while IFS= read -r line; do
  [ -z "$line" ] && break
  FIREBASE_PRIVATE_KEY="${FIREBASE_PRIVATE_KEY}${line}\\n"
done

section "Sentry (opcional, recomendado)"
SENTRY_DSN=$(ask "SENTRY_DSN (deixe em branco para pular)" "")

section "Slack Webhook (opcional, para alertas de worker)"
SLACK_WEBHOOK_URL=$(ask "SLACK_WEBHOOK_URL (deixe em branco para pular)" "")

# ── Escreve o arquivo .env.production ───────────────────────
cat > "$OUTPUT" <<EOF
# Gerado por scripts/generate-production-env.sh em $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# NÃO commitar este arquivo no git.

# ── Servidor ─────────────────────────────────────────────────
NODE_ENV=production
PORT=4000
CORS_ORIGIN=${CORS_ORIGIN}
APP_URL=${APP_URL}

# ── Banco de dados ────────────────────────────────────────────
DATABASE_URL=${DATABASE_URL}

# ── Redis ─────────────────────────────────────────────────────
REDIS_URL=${REDIS_URL}

# ── Auth JWT ──────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Email ─────────────────────────────────────────────────────
EMAIL_PROVIDER=${EMAIL_PROVIDER}
SENDGRID_API_KEY=${SENDGRID_API_KEY:-}
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
SMTP_FROM=${SMTP_FROM}

# ── AWS S3 ────────────────────────────────────────────────────
AWS_S3_BUCKET=${AWS_S3_BUCKET}
AWS_S3_REGION=${AWS_S3_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

# ── Firebase FCM ──────────────────────────────────────────────
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
FIREBASE_PRIVATE_KEY="${FIREBASE_PRIVATE_KEY}"

# ── Monitoramento ─────────────────────────────────────────────
SENTRY_DSN=${SENTRY_DSN:-}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}

# ── Setup inicial de produção (apague após criar o admin) ─────
SETUP_SECRET=${SETUP_SECRET}
EOF

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  $OUTPUT criado com sucesso!                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Próximos passos:"
echo ""
echo "  1. Copie o conteúdo de $OUTPUT para as variáveis"
echo "     de ambiente no painel do Render (Settings → Environment)"
echo ""
echo "  2. Faça o deploy e aguarde a API subir"
echo ""
echo "  3. Acesse o endpoint abaixo para criar o primeiro ADMIN:"
echo "     POST \${APP_URL}/api/v1/setup/init?secret=${SETUP_SECRET}"
echo "     Body JSON: {\"nome\":\"...\",\"email\":\"...\",\"senha\":\"...\"}"
echo ""
echo "  4. Remova SETUP_SECRET das variáveis de ambiente no Render"
echo "     após criar o admin (por segurança)"
echo ""
echo "  ⚠️  NÃO commite $OUTPUT no git!"
echo ""

# Garante que o arquivo não vai para o git
if ! grep -q ".env.production" .gitignore 2>/dev/null; then
  echo ".env.production" >> .gitignore
  echo "  ℹ️  .env.production adicionado ao .gitignore"
fi
