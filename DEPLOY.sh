#!/bin/bash

# ========================================
# imobi Deployment Script
# Deploy to Vercel + Railway
# ========================================

set -e

echo "🚀 imobi Deploy Script"
echo "====================="
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm is required. Install from pnpm.io"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo "❌ git is required"
  exit 1
fi

echo "✓ Dependencies OK"
echo ""

# Step 1: Build
echo "📦 Step 1: Building application..."
pnpm install
pnpm build

if [ $? -eq 0 ]; then
  echo "✓ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi
echo ""

# Step 2: Type checking
echo "🔍 Step 2: Type checking..."
pnpm type-check

if [ $? -eq 0 ]; then
  echo "✓ Type checking passed"
else
  echo "⚠️  Type errors found (non-blocking)"
fi
echo ""

# Step 3: Git status
echo "📝 Step 3: Checking git status..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMITS=$(git log --oneline origin/main..$BRANCH 2>/dev/null | wc -l)

echo "Current branch: $BRANCH"
echo "Commits ahead: $COMMITS"
echo ""

# Step 4: Pre-deploy checks
echo "✅ Step 4: Pre-deploy checks..."

if [ ! -f ".env.production.example" ]; then
  echo "⚠️  .env.production.example not found"
fi

if [ -f ".env.production" ]; then
  echo "⚠️  .env.production exists (should not be committed)"
fi

echo "✓ Pre-deploy checks complete"
echo ""

# Step 5: Instructions
echo "🎯 Step 5: Ready for deployment!"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1️⃣  FRONTEND DEPLOYMENT (Vercel)"
echo "   - Go to: https://vercel.com/new"
echo "   - Connect your GitHub/GitLab repository"
echo "   - Select branch: $BRANCH"
echo "   - Framework: Next.js (auto-detected)"
echo "   - Environment: NEXT_PUBLIC_API_URL=https://your-api.railway.app"
echo "   - Deploy!"
echo ""
echo "2️⃣  BACKEND DEPLOYMENT (Railway)"
echo "   - Go to: https://railway.app/new"
echo "   - Select 'Deploy from GitHub'"
echo "   - Select your repository"
echo "   - Add PostgreSQL service"
echo "   - Add Redis service"
echo "   - Configure environment variables (see .env.production.example)"
echo "   - Deploy!"
echo ""
echo "3️⃣  POST-DEPLOYMENT"
echo "   - Update NEXT_PUBLIC_API_URL in Vercel with Railway URL"
echo "   - Run migrations: pnpm db:migrate"
echo "   - Test health check: curl https://your-api/api/v1/health"
echo "   - Test signup flow: https://your-frontend.vercel.app/cadastro"
echo ""
echo "📚 Full guide: ./DEPLOY_GUIDE.md"
echo ""
echo "✨ Happy deploying!"
