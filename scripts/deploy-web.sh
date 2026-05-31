#!/bin/bash
set -e

# Deploy Next.js Web to AWS EC2
# Usage: ./deploy-web.sh <WEB_IP> <API_URL> [ENVIRONMENT]

WEB_IP=${1:-""}
API_URL=${2:-""}
ENVIRONMENT=${3:-"production"}
SSH_KEY="${HOME}/.ssh/imobi-key.pem"

if [ -z "$WEB_IP" ] || [ -z "$API_URL" ]; then
  echo "Usage: ./deploy-web.sh <WEB_IP> <API_URL> [ENVIRONMENT]"
  echo "Example: ./deploy-web.sh 54.234.56.78 http://54.123.45.67:3001 production"
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "Error: SSH key not found at $SSH_KEY"
  echo "Create it with: aws ec2 create-key-pair --key-name imobi-web --region sa-east-1"
  exit 1
fi

echo "🚀 Deploying Next.js Web to $WEB_IP..."

# Copy repository to EC2
echo "📦 Copying application code..."
ssh -i "$SSH_KEY" ubuntu@"$WEB_IP" "rm -rf /opt/imobi/*"
scp -i "$SSH_KEY" -r \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  --exclude=.env \
  --exclude=.env.production \
  . ubuntu@"$WEB_IP":/opt/imobi/

# Install dependencies and build
echo "🔨 Building application..."
ssh -i "$SSH_KEY" ubuntu@"$WEB_IP" << EOF
cd /opt/imobi
export NEXT_PUBLIC_API_URL="$API_URL"
pnpm install --frozen-lockfile
pnpm build
EOF

# Restart Web service
echo "🔄 Restarting Web service..."
ssh -i "$SSH_KEY" ubuntu@"$WEB_IP" << 'EOF'
pm2 stop imobi-web || true
pm2 delete imobi-web || true
cd /opt/imobi
pm2 start "pnpm start --port 3000" --name "imobi-web"
pm2 save
EOF

# Verify deployment
echo "✅ Verifying deployment..."
sleep 5
ssh -i "$SSH_KEY" ubuntu@"$WEB_IP" "curl -s http://localhost:3000 | head -20 || echo 'Web not yet ready'"

echo ""
echo "✨ Deployment complete!"
echo "Web URL: http://$WEB_IP:3000"
echo "API URL: $API_URL"
echo ""
echo "View logs:"
echo "  ssh -i $SSH_KEY ubuntu@$WEB_IP"
echo "  pm2 logs imobi-web"
