#!/bin/bash

# QUICK START — Local Development & Staging Setup
# Usage: bash QUICK_START.sh [staging|local]

set -e

MODE=${1:-local}
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🚀 iMobi Quick Start — $MODE Environment       ║"
echo "║         $TIMESTAMP                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose required"; exit 1; }
echo -e "${GREEN}✓ Docker available${NC}"

if [ "$MODE" = "staging" ]; then
    echo ""
    echo "🔧 Setting up Staging Environment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check .env.staging
    if [ ! -f ".env.staging" ]; then
        echo "⚠️  Creating .env.staging from template..."
        cp services/api/.env.staging.example .env.staging
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.staging with your configuration${NC}"
        echo "   - JWT_SECRET (>64 chars)"
        echo "   - ENCRYPTION_KEY (base64)"
        echo "   - Database credentials"
        echo "   - Redis password"
        read -p "   Continue? (y/n) " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] || exit 1
    fi
    
    # Load environment
    export $(cat .env.staging | xargs)
    
    # Start services
    echo ""
    echo "🐳 Starting Docker services..."
    docker-compose -f docker-compose.staging.yml up -d
    
    # Wait for services
    echo "⏳ Waiting for services to be healthy..."
    sleep 10
    
    # Run migrations
    echo ""
    echo "🗄️  Running database migrations..."
    docker-compose -f docker-compose.staging.yml exec -T api pnpm db:migrate || true
    
    # Show status
    echo ""
    echo "✅ Staging environment ready!"
    echo ""
    echo "📊 Service URLs:"
    echo "   Web:  http://localhost:3000"
    echo "   API:  http://localhost:4000"
    echo "   Docs: http://localhost:4000/api"
    echo ""
    echo "🛑 To stop: docker-compose -f docker-compose.staging.yml down"
    
elif [ "$MODE" = "local" ]; then
    echo ""
    echo "💻 Setting up Local Development Environment"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    pnpm install
    
    # Type checking
    echo ""
    echo "✓ Running type checks..."
    pnpm type-check
    
    # Database setup (if PostgreSQL available)
    if command -v psql >/dev/null 2>&1; then
        echo ""
        echo "🗄️  Setting up local database..."
        psql -h localhost -U postgres -c "CREATE DATABASE imobi;" 2>/dev/null || echo "   Database may exist"
        pnpm db:migrate || echo "   ⚠️  Database migration skipped (PostgreSQL may not be running)"
    else
        echo ""
        echo "⚠️  PostgreSQL not found. Database setup skipped."
        echo "   To enable: sudo apt-get install postgresql"
    fi
    
    # Build
    echo ""
    echo "🔨 Building production artifacts..."
    pnpm build
    
    echo ""
    echo "✅ Local environment ready!"
    echo ""
    echo "🚀 Start development servers:"
    echo "   pnpm dev"
    echo ""
    echo "📊 Services will run at:"
    echo "   Web:  http://localhost:3000"
    echo "   API:  http://localhost:4000"
    
else
    echo "❌ Invalid mode. Use: staging or local"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
