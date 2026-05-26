#!/bin/bash
set -euo pipefail

# Install FFmpeg and other dependencies required by Remotion
# This runs once per session and caches the container state

# Ensure we're in the project root
cd "${CLAUDE_PROJECT_DIR:-.}"

echo "🎬 Setting up Remotion environment..."

# Update package lists (required before apt install)
apt-get update -qq || true

# Install FFmpeg (required for Remotion video rendering)
if ! command -v ffmpeg &> /dev/null; then
  echo "📦 Installing FFmpeg (required for Remotion rendering)..."
  apt-get install -y ffmpeg > /dev/null 2>&1 || {
    echo "⚠️  FFmpeg installation failed, but continuing..."
  }
else
  echo "✅ FFmpeg already installed"
fi

# Install pnpm dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing pnpm dependencies..."
  pnpm install --frozen-lockfile || pnpm install
fi

echo "✅ Remotion environment ready!"
