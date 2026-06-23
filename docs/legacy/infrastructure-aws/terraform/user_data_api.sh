#!/bin/bash
set -e

# Update system packages
apt-get update
apt-get upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install git
apt-get install -y git

# Install PostgreSQL client (for migrations)
apt-get install -y postgresql-client

# Install Redis client (for testing)
apt-get install -y redis-tools

# Install PM2 for process management
npm install -g pm2

# Create application directory
mkdir -p /opt/imobi
cd /opt/imobi

# Create a placeholder environment file
cat > /opt/imobi/.env.production << 'EOF'
NODE_ENV=production
API_PORT=${api_port}
DATABASE_URL=postgresql://postgres:$DB_PASSWORD@$DB_ENDPOINT/imobi_prod
REDIS_URL=redis://$REDIS_ENDPOINT:6379
LOG_LEVEL=info
EOF

# Set permissions
chown -R ubuntu:ubuntu /opt/imobi
chmod 755 /opt/imobi

# Create systemd service for API
cat > /etc/systemd/system/imobi-api.service << 'EOF'
[Unit]
Description=imobi NestJS API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/imobi
Environment="NODE_ENV=production"
Environment="API_PORT=${api_port}"
ExecStart=/usr/bin/pm2 start dist/main.js --name "imobi-api"
ExecReload=/usr/bin/pm2 reload imobi-api
ExecStop=/usr/bin/pm2 delete imobi-api
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable systemd service
systemctl daemon-reload

# Log startup completion
echo "NestJS API initialization complete at $(date)" > /var/log/imobi-api-init.log

# CloudWatch Logs Agent setup (optional, for logs streaming)
# This would be configured via Systems Manager or manually later
