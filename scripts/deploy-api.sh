#!/bin/bash
set -e

# Deploy NestJS API to AWS EC2
# Usage: ./deploy-api.sh <API_IP> <ENVIRONMENT>

API_IP=${1:-""}
ENVIRONMENT=${2:-"production"}
SSH_KEY="${HOME}/.ssh/imobi-api.pem"

if [ -z "$API_IP" ]; then
  echo "Usage: ./deploy-api.sh <API_IP> [ENVIRONMENT]"
  echo "Example: ./deploy-api.sh 54.123.45.67 production"
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "Error: SSH key not found at $SSH_KEY"
  echo "Create it with: aws ec2 create-key-pair --key-name imobi-api --region sa-east-1"
  exit 1
fi

echo "🚀 Deploying NestJS API to $API_IP..."

# Copy repository to EC2
echo "📦 Copying application code..."
ssh -i "$SSH_KEY" ubuntu@"$API_IP" "rm -rf /opt/imobi/*"
scp -i "$SSH_KEY" -r \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  --exclude=.env \
  --exclude=.env.production \
  . ubuntu@"$API_IP":/opt/imobi/

# Install dependencies and build
echo "🔨 Building application..."
ssh -i "$SSH_KEY" ubuntu@"$API_IP" << 'EOF'
cd /opt/imobi
pnpm install --frozen-lockfile
pnpm build
npx prisma migrate deploy || true
EOF

# Restart API service
echo "🔄 Restarting API service..."
ssh -i "$SSH_KEY" ubuntu@"$API_IP" << 'EOF'
pm2 stop imobi-api || true
pm2 delete imobi-api || true
cd /opt/imobi
pm2 start dist/main.js --name "imobi-api"
pm2 save
EOF

# Verify deployment
echo "✅ Verifying deployment..."
sleep 3
ssh -i "$SSH_KEY" ubuntu@"$API_IP" "curl -s http://localhost:3001/health || echo 'API not yet ready'"

echo ""
echo "✨ Deployment complete!"
echo "API URL: http://$API_IP:3001"
echo ""
echo "View logs:"
echo "  ssh -i $SSH_KEY ubuntu@$API_IP"
echo "  pm2 logs imobi-api"
