#!/bin/bash

# Turborepo Remote Cache Setup Script
# This script helps configure remote caching for faster builds

set -e

echo "======================================"
echo "Turborepo Remote Cache Setup"
echo "======================================"
echo ""
echo "Choose your caching strategy:"
echo ""
echo "1) Vercel Remote Cache (Recommended for teams)"
echo "   - Fastest setup"
echo "   - Free tier available"
echo "   - Requires Vercel account"
echo ""
echo "2) Self-hosted Turborepo Cache"
echo "   - Full control"
echo "   - Can run locally or on own infrastructure"
echo "   - Requires additional setup"
echo ""
echo "3) Skip for now (local-only caching)"
echo "   - Works fine for single developer"
echo "   - Not recommended for teams"
echo ""

read -p "Choose option (1, 2, or 3): " choice

case $choice in
  1)
    echo ""
    echo "Setting up Vercel Remote Cache..."
    echo "Running: turbo link"
    echo ""
    if command -v turbo &> /dev/null; then
      turbo link
      echo ""
      echo "✓ Vercel Remote Cache configured!"
      echo "Your builds will now use the Vercel cache."
    else
      echo "Error: turbo CLI not found. Please install it with: npm install -g turbo"
      exit 1
    fi
    ;;
  2)
    echo ""
    echo "Setting up self-hosted Turborepo Cache..."
    echo ""
    echo "You can deploy a Turborepo cache server using Docker:"
    echo ""
    echo "  docker run -d \\"
    echo "    -p 3000:3000 \\"
    echo "    -e TURBO_TOKEN=your-secret-token \\"
    echo "    ghcr.io/vercel/turborepo-remote-cache:latest"
    echo ""
    echo "Then set these environment variables:"
    echo ""
    read -p "Enter your cache server URL (e.g., https://cache.example.com): " server_url
    read -p "Enter your cache token: " cache_token
    echo ""
    echo "export TURBO_REMOTE_CACHE_SERVER=\"$server_url\"" >> .env.turbo
    echo "export TURBO_REMOTE_CACHE_TOKEN=\"$cache_token\"" >> .env.turbo
    echo ""
    echo "✓ Self-hosted cache configuration saved to .env.turbo"
    echo ""
    echo "To use these settings, add to your CI/CD environment:"
    echo "  - TURBO_REMOTE_CACHE_SERVER=$server_url"
    echo "  - TURBO_REMOTE_CACHE_TOKEN=$cache_token"
    ;;
  3)
    echo ""
    echo "Skipping remote cache setup."
    echo "You can set it up later by running: bash scripts/setup-turbo-cache.sh"
    ;;
  *)
    echo "Invalid option. Please choose 1, 2, or 3."
    exit 1
    ;;
esac

echo ""
echo "✓ Setup complete!"
echo ""
echo "Your next builds will be faster with remote caching enabled."
