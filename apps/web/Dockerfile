# Multi-stage build for Web service (Next.js)
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy root package files and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages and apps
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build dependencies first
RUN pnpm -F @imbobi/schemas build
RUN pnpm -F @imbobi/core build
RUN pnpm -F @imbobi/ui build

# Build Web app
RUN pnpm --filter @imbobi/web build

# Production stage - minimal image
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy necessary files from builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/package.json ./apps/web/
COPY apps/web/next.config.js ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "--filter", "@imbobi/web", "start"]
