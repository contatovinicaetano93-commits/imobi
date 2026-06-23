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

# Install PM2 for process management
npm install -g pm2

# Create application directory
mkdir -p /opt/imobi
cd /opt/imobi

# Create a placeholder environment file
cat > /opt/imobi/.env.production << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://$API_ENDPOINT:3001
NEXT_PUBLIC_APP_URL=http://$(hostname -I | awk '{print $1}'):${web_port}
LOG_LEVEL=info
EOF

# Set permissions
chown -R ubuntu:ubuntu /opt/imobi
chmod 755 /opt/imobi

# Create systemd service for Web
cat > /etc/systemd/system/imobi-web.service << 'EOF'
[Unit]
Description=imobi Next.js Web Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/imobi
Environment="NODE_ENV=production"
Environment="PORT=${web_port}"
ExecStart=/usr/bin/pm2 start "pnpm start --port ${web_port}" --name "imobi-web"
ExecReload=/usr/bin/pm2 reload imobi-web
ExecStop=/usr/bin/pm2 delete imobi-web
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable systemd service
systemctl daemon-reload

# Log startup completion
echo "Next.js Web initialization complete at $(date)" > /var/log/imobi-web-init.log

# CloudWatch Logs Agent setup (optional, for logs streaming)
# This would be configured via Systems Manager or manually later
