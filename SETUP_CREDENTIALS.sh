#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  imobi Staging Credentials Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"

# Create .env.staging from template
if [ ! -f ".env.staging" ]; then
  cp .env.staging.example .env.staging
  echo -e "${GREEN}✓${NC} Created .env.staging\n"
else
  echo "Note: .env.staging already exists. Will update values.\n"
fi

# Generate JWT_SECRET
echo -e "${YELLOW}━━━ 1. Security Keys ━━━${NC}\n"
echo "Generating JWT_SECRET..."
JWT_SECRET=$(openssl rand -base64 48)
echo -e "${GREEN}Generated: $JWT_SECRET${NC}\n"

echo "Generating ENCRYPTION_KEY..."
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo -e "${GREEN}Generated: $ENCRYPTION_KEY${NC}\n"

# AWS Configuration
echo -e "${YELLOW}━━━ 2. AWS S3 ━━━${NC}\n"
read -p "AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
read -p "S3 Bucket Name (default: imobi-evidencias-staging): " S3_BUCKET
S3_BUCKET=${S3_BUCKET:-imobi-evidencias-staging}

# Email Configuration
echo -e "\n${YELLOW}━━━ 3. Email Provider (SMTP) ━━━${NC}\n"
read -p "SMTP Host (e.g., smtp.gmail.com): " SMTP_HOST
read -p "SMTP Port (default: 587): " SMTP_PORT
SMTP_PORT=${SMTP_PORT:-587}
read -p "SMTP User (e.g., contato.vinicaetano93@gmail.com): " SMTP_USER
read -p "SMTP Password (Gmail app password): " SMTP_PASS
read -p "SMTP From Email: " SMTP_FROM

# Firebase Configuration
echo -e "\n${YELLOW}━━━ 4. Firebase ━━━${NC}\n"
read -p "Firebase Project ID (e.g., imobi-staging): " FIREBASE_PROJECT_ID
read -p "Firebase Client Email: " FIREBASE_CLIENT_EMAIL
echo "Paste Firebase Private Key (paste entire key, press Enter twice when done):"
FIREBASE_PRIVATE_KEY=$(cat)

# Update .env.staging
echo -e "\n${YELLOW}━━━ Updating .env.staging ━━━${NC}\n"

# Use sed to update variables
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.staging
sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env.staging
sed -i "s|^AWS_REGION=.*|AWS_REGION=$AWS_REGION|" .env.staging
sed -i "s|^AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID|" .env.staging
sed -i "s|^AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY|" .env.staging
sed -i "s|^S3_BUCKET=.*|S3_BUCKET=$S3_BUCKET|" .env.staging
sed -i "s|^EMAIL_PROVIDER=.*|EMAIL_PROVIDER=smtp|" .env.staging
sed -i "s|^SMTP_HOST=.*|SMTP_HOST=$SMTP_HOST|" .env.staging
sed -i "s|^SMTP_PORT=.*|SMTP_PORT=$SMTP_PORT|" .env.staging
sed -i "s|^SMTP_USER=.*|SMTP_USER=$SMTP_USER|" .env.staging
sed -i "s|^SMTP_PASSWORD=.*|SMTP_PASSWORD=$SMTP_PASS|" .env.staging
sed -i "s|^SMTP_FROM=.*|SMTP_FROM=$SMTP_FROM|" .env.staging
sed -i "s|^FIREBASE_PROJECT_ID=.*|FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID|" .env.staging
sed -i "s|^FIREBASE_CLIENT_EMAIL=.*|FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL|" .env.staging
sed -i "s|^FIREBASE_PRIVATE_KEY=.*|FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY|" .env.staging

echo -e "${GREEN}✓${NC} Updated .env.staging with all credentials\n"

echo -e "${YELLOW}━━━ Setup Complete! ━━━${NC}\n"
echo "Next step: Run 'bash DEPLOY.sh' to start staging deployment"
echo ""
