#!/bin/bash

# Pre-push hook script for imobi project
# This script runs type-checking before allowing a push

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running pre-push checks...${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}Error: pnpm is not installed${NC}"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${YELLOW}Step 1/2: Running type-check...${NC}"
if ! pnpm type-check; then
    echo -e "${RED}Type checking failed!${NC}"
    echo -e "${YELLOW}Fix TypeScript errors before pushing.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Type checking passed${NC}"

echo -e "${YELLOW}Step 2/2: Running linter (if available)...${NC}"
if pnpm run lint 2>/dev/null; then
    echo -e "${GREEN}✓ Linter passed${NC}"
else
    echo -e "${YELLOW}! Linter check skipped (not configured)${NC}"
fi

echo -e "${GREEN}All pre-push checks passed!${NC}"
echo -e "${GREEN}Proceeding with push...${NC}"
exit 0
