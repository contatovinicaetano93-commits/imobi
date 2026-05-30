#!/bin/bash
set -e

echo "🔨 iMobi Vercel Build Script"
echo "---"

# Install dependencies at root
echo "📦 Installing dependencies..."
pnpm install

# Run Turbo build for the web app (which handles workspace dependencies)
echo "🏗️ Building with Turbo..."
turbo run build --filter=@imbobi/web

# Verify output exists
if [ ! -d "apps/web/.next" ]; then
  echo "❌ Build failed: apps/web/.next not found"
  exit 1
fi

echo "✅ Build completed successfully"
