# Multi-stage build for API service
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy root package files and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages and services
COPY packages ./packages
COPY services ./services

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build all packages
RUN pnpm -F @imbobi/schemas build
RUN pnpm -F @imbobi/core build
RUN pnpm -F @imbobi/ui build

# Build API
RUN pnpm --filter @imbobi/api build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy packages (for production deps)
COPY packages ./packages
COPY services/api/dist ./services/api/dist

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "services/api/dist/main.js"]
