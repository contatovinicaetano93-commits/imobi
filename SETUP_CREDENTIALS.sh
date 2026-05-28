#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_section() {
  echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}$1${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_header "imobi Staging Credentials Setup"

cat << 'EOF'
This script will help you gather and configure all credentials needed for
staging deployment. You'll need:

  • AWS S3 access keys (for evidence photos)
  • Email service credentials (SendGrid/SES/SMTP)
  • Firebase project details (for push notifications)
  • (Optional) Unico & SERPRO API keys for KYC

You can skip optional services and configure them later.

EOF

# Create .env.staging from template
if [ ! -f ".env.staging" ]; then
  echo "Creating .env.staging from template..."
  cp .env.staging.example .env.staging
  echo -e "${GREEN}✓${NC} Created .env.staging\n"
else
  echo "Note: .env.staging already exists. Will update with new values."
fi

# Generate secure keys if not already set
print_section "1. Security Keys"

cat << 'EOF'
These keys should be long, random strings. Generate them with:

  JWT_SECRET (64+ chars):
    openssl rand -base64 48

  ENCRYPTION_KEY (32 chars):
    openssl rand -base64 32

EOF

echo "Generate JWT_SECRET?"
echo "  Command: openssl rand -base64 48"
read -p "Paste your JWT_SECRET: " JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
  echo "Generating random JWT_SECRET..."
  JWT_SECRET=$(openssl rand -base64 48)
  echo -e "${GREEN}Generated: $JWT_SECRET${NC}"
fi

echo ""
echo "Generate ENCRYPTION_KEY?"
echo "  Command: openssl rand -base64 32"
read -p "Paste your ENCRYPTION_KEY: " ENCRYPTION_KEY

if [ -z "$ENCRYPTION_KEY" ]; then
  echo "Generating random ENCRYPTION_KEY..."
  ENCRYPTION_KEY=$(openssl rand -base64 32)
  echo -e "${GREEN}Generated: $ENCRYPTION_KEY${NC}"
fi

# AWS S3 Configuration
print_section "2. AWS S3 (Required)"

cat << 'EOF'
S3 is used for storing construction evidence photos.

To get credentials:
  1. Go to AWS IAM Console
  2. Create a new user with S3 access
  3. Create access keys
  4. Create/use an S3 bucket named: imbobi-evidencias-staging

EOF

read -p "AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
while [ -z "$AWS_ACCESS_KEY_ID" ]; do
  echo "AWS Access Key ID is required"
  read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
done

read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
while [ -z "$AWS_SECRET_ACCESS_KEY" ]; do
  echo "AWS Secret Access Key is required"
  read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
done

read -p "S3 Bucket Name (default: imbobi-evidencias-staging): " S3_BUCKET
S3_BUCKET=${S3_BUCKET:-imbobi-evidencias-staging}

# Email Configuration
print_section "3. Email Provider (Required)"

echo "Choose email provider:"
echo "  1) SendGrid (recommended)"
echo "  2) AWS SES"
echo "  3) SMTP (Gmail, etc.)"

read -p "Select (1-3): " EMAIL_CHOICE

case $EMAIL_CHOICE in
  1)
    EMAIL_PROVIDER="sendgrid"
    read -p "SendGrid API Key (format: SG...): " SENDGRID_API_KEY
    while [ -z "$SENDGRID_API_KEY" ]; then
      echo "SendGrid API Key is required"
      read -p "SendGrid API Key: " SENDGRID_API_KEY
    done
    ;;
  2)
    EMAIL_PROVIDER="ses"
    echo "Using AWS credentials from above for SES"
    ;;
  3)
    EMAIL_PROVIDER="smtp"
    read -p "SMTP Host (e.g., smtp.gmail.com): " SMTP_HOST
    read -p "SMTP Port (default: 587): " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "SMTP User: " SMTP_USER
    read -p "SMTP Password: " SMTP_PASS
    read -p "SMTP From (e.g., noreply@imbobi.staging): " SMTP_FROM
    ;;
esac

# Firebase Configuration
print_section "4. Firebase (Required)"

cat << 'EOF'
Firebase is used for push notifications.

To get credentials:
  1. Go to Firebase Console
  2. Create a new project (or use existing)
  3. Go to Project Settings → Service Accounts
  4. Click "Generate New Private Key"
  5. Download the JSON file

Copy the values from the JSON file below:

EOF

read -p "Firebase Project ID: " FIREBASE_PROJECT_ID
while [ -z "$FIREBASE_PROJECT_ID" ]; do
  echo "Firebase Project ID is required"
  read -p "Firebase Project ID: " FIREBASE_PROJECT_ID
done

read -p "Firebase Client Email (from JSON): " FIREBASE_CLIENT_EMAIL
while [ -z "$FIREBASE_CLIENT_EMAIL" ]; do
  echo "Firebase Client Email is required"
  read -p "Firebase Client Email: " FIREBASE_CLIENT_EMAIL
done

echo "Firebase Private Key (paste full key, press Enter twice when done):"
FIREBASE_PRIVATE_KEY=""
while IFS= read -r line; do
  [ -z "$line" ] && break
  FIREBASE_PRIVATE_KEY="${FIREBASE_PRIVATE_KEY}${line}\n"
done

# Optional: Unico API Key
print_section "5. KYC Services (Optional)"

read -p "Unico API Key (optional, press Enter to skip): " UNICO_API_KEY

# Update .env.staging
echo ""
echo "Updating .env.staging with your configuration..."

# Create sed commands for updating env file
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env.staging
sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" .env.staging
sed -i "s|^AWS_REGION=.*|AWS_REGION=$AWS_REGION|" .env.staging
sed -i "s|^AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID|" .env.staging
sed -i "s|^AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY|" .env.staging
sed -i "s|^S3_BUCKET=.*|S3_BUCKET=$S3_BUCKET|" .env.staging
sed -i "s|^EMAIL_PROVIDER=.*|EMAIL_PROVIDER=$EMAIL_PROVIDER|" .env.staging
sed -i "s|^FIREBASE_PROJECT_ID=.*|FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID|" .env.staging
sed -i "s|^FIREBASE_CLIENT_EMAIL=.*|FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL|" .env.staging
sed -i "s|^FIREBASE_PRIVATE_KEY=.*|FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY|" .env.staging

if [ "$EMAIL_PROVIDER" = "sendgrid" ]; then
  sed -i "s|^SENDGRID_API_KEY=.*|SENDGRID_API_KEY=$SENDGRID_API_KEY|" .env.staging
elif [ "$EMAIL_PROVIDER" = "smtp" ]; then
  sed -i "s|^SMTP_HOST=.*|SMTP_HOST=$SMTP_HOST|" .env.staging
  sed -i "s|^SMTP_PORT=.*|SMTP_PORT=$SMTP_PORT|" .env.staging
  sed -i "s|^SMTP_USER=.*|SMTP_USER=$SMTP_USER|" .env.staging
  sed -i "s|^SMTP_PASS=.*|SMTP_PASS=$SMTP_PASS|" .env.staging
  sed -i "s|^SMTP_FROM=.*|SMTP_FROM=$SMTP_FROM|" .env.staging
fi

if [ -n "$UNICO_API_KEY" ]; then
  sed -i "s|^UNICO_API_KEY=.*|UNICO_API_KEY=$UNICO_API_KEY|" .env.staging
fi

# Final summary
print_header "✅ Credentials Configured!"

cat << EOF

${GREEN}Your .env.staging has been updated with:${NC}

  ✓ JWT_SECRET
  ✓ ENCRYPTION_KEY
  ✓ AWS_ACCESS_KEY_ID
  ✓ AWS_SECRET_ACCESS_KEY
  ✓ S3_BUCKET
  ✓ EMAIL_PROVIDER ($EMAIL_PROVIDER)
  ✓ FIREBASE_PROJECT_ID
  ✓ FIREBASE_CLIENT_EMAIL
  ✓ FIREBASE_PRIVATE_KEY

${YELLOW}Next Step:${NC}

  Run the deployment script:
    bash DEPLOY.sh

${YELLOW}Or, to review your configuration:${NC}

  cat .env.staging

EOF
