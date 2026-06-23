#!/bin/bash

# 🚀 Start Imobi API Locally
# Usage: bash scripts/start-api-local.sh

set -e

echo "📋 Starting Imobi API..."
echo "🔗 URL: http://localhost:4000"
echo "📚 Docs: http://localhost:4000/api/v1/docs"
echo ""

cd services/api

# Check if dist exists
if [ ! -d "dist" ]; then
  echo "🏗️  Building API..."
  pnpm build
  echo "✅ Build complete"
fi

# Load environment
if [ -f ".env.local" ]; then
  echo "✅ Using .env.local"
  export $(cat .env.local | grep -v '#' | xargs)
else
  echo "❌ Error: .env.local not found"
  exit 1
fi

# Start API
echo ""
echo "⚡ Starting application..."
echo "   Press Ctrl+C to stop"
echo ""

node --enable-source-maps dist/main.js
