# Multi-stage build for production-optimized API image

# ════════════════════════════════════════════════════════════
# Stage 1: Dependencies
# ════════════════════════════════════════════════════════════
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json ./services/api/

# Install pnpm
RUN npm install -g pnpm@9

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# ════════════════════════════════════════════════════════════
# Stage 2: Builder
# ════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json ./services/api/
COPY packages ./packages
COPY services/api ./services/api
COPY tsconfig.json ./

# Install pnpm
RUN npm install -g pnpm@9

# Install dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN cd services/api && pnpm exec prisma generate

# Build API
RUN pnpm --filter @imbobi/api build

# ════════════════════════════════════════════════════════════
# Stage 3: Runtime
# ════════════════════════════════════════════════════════════
FROM node:20-alpine AS runtime

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only production dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package.json files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json ./services/api/

# Copy built application from builder stage
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/prisma ./services/api/prisma
COPY --from=builder /app/services/api/node_modules/.prisma ./services/api/node_modules/.prisma
COPY --from=builder /app/packages ./packages

# Copy Prisma schema for runtime
COPY services/api/prisma ./services/api/prisma

# Set environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024"

# Security: Change to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=60s \
  CMD curl -f http://localhost:4000/health || exit 1

# Expose API port
EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "services/api/dist/main.js"]
