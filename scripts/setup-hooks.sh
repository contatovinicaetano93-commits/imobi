#!/bin/bash

# Setup script to install Git hooks for imobi project

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up Git hooks...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Check if .git directory exists
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo -e "${YELLOW}Warning: Not in a git repository${NC}"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-push hook
if [ -f "$SCRIPT_DIR/pre-push.sh" ]; then
    cp "$SCRIPT_DIR/pre-push.sh" "$HOOKS_DIR/pre-push"
    chmod +x "$HOOKS_DIR/pre-push"
    echo -e "${GREEN}✓ Installed pre-push hook${NC}"
else
    echo -e "${YELLOW}Warning: pre-push.sh not found${NC}"
fi

echo -e "${GREEN}Git hooks setup complete!${NC}"
echo -e "${YELLOW}Hooks installed:${NC}"
echo "  - pre-push: Runs type-check before push"
echo ""
echo -e "${YELLOW}To uninstall hooks, run:${NC}"
echo "  rm -rf .git/hooks"
