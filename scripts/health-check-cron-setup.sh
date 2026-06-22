#!/bin/bash

################################################################################
# IMOBI CRON JOB SETUP SCRIPT
#
# Purpose: Automate health check monitoring via crontab
# Usage: ./scripts/health-check-cron-setup.sh
# This script sets up automated health checks at specified intervals
#
################################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_CHECK_SCRIPT="$SCRIPT_DIR/health-check.sh"
HEALTH_CHECK_DAILY="$SCRIPT_DIR/health-check-daily.sh"
CRONTAB_FILE="/tmp/imobi-crontab.txt"

echo -e "${BLUE}╔════════════════════════════════════════════════╗"
echo "║     IMOBI CRON JOB SETUP SCRIPT                 ║"
echo -e "╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if scripts exist
if [ ! -f "$HEALTH_CHECK_SCRIPT" ]; then
  echo -e "${RED}❌ Error: $HEALTH_CHECK_SCRIPT not found${NC}"
  exit 1
fi

if [ ! -f "$HEALTH_CHECK_DAILY" ]; then
  echo -e "${RED}❌ Error: $HEALTH_CHECK_DAILY not found${NC}"
  exit 1
fi

# Make scripts executable
chmod +x "$HEALTH_CHECK_SCRIPT"
chmod +x "$HEALTH_CHECK_DAILY"

echo -e "${GREEN}✅ Scripts are executable${NC}"
echo ""

# Show current crontab
echo -e "${BLUE}Current Crontab Entries:${NC}"
echo "─────────────────────────────────────────"
crontab -l 2>/dev/null || echo "No crontab entries"
echo ""

# Create new crontab with health checks
echo -e "${BLUE}Setting up cron jobs...${NC}"
echo "─────────────────────────────────────────"
echo ""

# Option 1: Every 5 minutes (UptimeRobot-like)
echo "Option 1: Every 5 minutes (recommended for production)"
echo "  */5 * * * * $HEALTH_CHECK_SCRIPT >> /var/log/imobi/health-check.log 2>&1"
echo ""

# Option 2: Every hour during business hours
echo "Option 2: Every hour (8 AM - 6 PM, weekdays)"
echo "  0 8-18 * * 1-5 $HEALTH_CHECK_SCRIPT >> /var/log/imobi/health-check.log 2>&1"
echo ""

# Option 3: Daily report
echo "Option 3: Daily report (8 AM every day)"
echo "  0 8 * * * $HEALTH_CHECK_DAILY 2>&1"
echo ""

# Ask user which option to set up
echo -e "${YELLOW}Which option would you like to enable?${NC}"
echo "1) Every 5 minutes (24/7 monitoring)"
echo "2) Business hours only (8 AM - 6 PM)"
echo "3) Daily report only (8 AM)"
echo "4) All of the above"
echo "0) Skip (manual setup)"
echo ""

read -p "Enter choice (0-4): " choice

# Create directory for logs if needed
mkdir -p /var/log/imobi

# Get existing crontab
{
  crontab -l 2>/dev/null || true
} > "$CRONTAB_FILE"

# Add selected cron jobs
case $choice in
  1)
    echo -e "${BLUE}Setting up: Every 5 minutes${NC}"
    # Remove existing health check entries
    grep -v "health-check.sh" "$CRONTAB_FILE" > "$CRONTAB_FILE.tmp" || true
    mv "$CRONTAB_FILE.tmp" "$CRONTAB_FILE"

    # Add new entry
    echo "*/5 * * * * $HEALTH_CHECK_SCRIPT >> /var/log/imobi/health-check.log 2>&1" >> "$CRONTAB_FILE"
    crontab "$CRONTAB_FILE"
    echo -e "${GREEN}✅ Cron job added${NC}"
    ;;
  2)
    echo -e "${BLUE}Setting up: Business hours only${NC}"
    grep -v "health-check.sh" "$CRONTAB_FILE" > "$CRONTAB_FILE.tmp" || true
    mv "$CRONTAB_FILE.tmp" "$CRONTAB_FILE"

    echo "0 8-18 * * 1-5 $HEALTH_CHECK_SCRIPT >> /var/log/imobi/health-check.log 2>&1" >> "$CRONTAB_FILE"
    crontab "$CRONTAB_FILE"
    echo -e "${GREEN}✅ Cron job added${NC}"
    ;;
  3)
    echo -e "${BLUE}Setting up: Daily report${NC}"
    grep -v "health-check-daily.sh" "$CRONTAB_FILE" > "$CRONTAB_FILE.tmp" || true
    mv "$CRONTAB_FILE.tmp" "$CRONTAB_FILE"

    echo "0 8 * * * $HEALTH_CHECK_DAILY 2>&1" >> "$CRONTAB_FILE"
    crontab "$CRONTAB_FILE"
    echo -e "${GREEN}✅ Cron job added${NC}"
    ;;
  4)
    echo -e "${BLUE}Setting up: All options${NC}"
    grep -v -E "health-check.sh|health-check-daily.sh" "$CRONTAB_FILE" > "$CRONTAB_FILE.tmp" || true
    mv "$CRONTAB_FILE.tmp" "$CRONTAB_FILE"

    echo "*/5 * * * * $HEALTH_CHECK_SCRIPT >> /var/log/imobi/health-check.log 2>&1" >> "$CRONTAB_FILE"
    echo "0 8 * * * $HEALTH_CHECK_DAILY 2>&1" >> "$CRONTAB_FILE"
    crontab "$CRONTAB_FILE"
    echo -e "${GREEN}✅ All cron jobs added${NC}"
    ;;
  0)
    echo -e "${YELLOW}Skipping automatic setup${NC}"
    echo "Manual setup required. See crontab -e"
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""

# Show new crontab
echo -e "${BLUE}Updated Crontab:${NC}"
echo "─────────────────────────────────────────"
crontab -l 2>/dev/null || echo "No crontab entries"
echo ""

# Clean up
rm -f "$CRONTAB_FILE" "$CRONTAB_FILE.tmp"

# Test the health check script
echo -e "${BLUE}Testing health check script...${NC}"
echo "─────────────────────────────────────────"
if "$HEALTH_CHECK_SCRIPT"; then
  echo -e "${GREEN}✅ Health check script working${NC}"
else
  echo -e "${YELLOW}⚠️  Health check script needs attention${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify cron jobs: crontab -l"
echo "2. Monitor logs: tail -f /var/log/imobi/health-check.log"
echo "3. Test manually: ./scripts/health-check.sh"
echo ""
