# Multi-stage build for Next.js Web App
# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy monorepo files
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Next.js app
RUN cd apps/web && pnpm build

# Stage 2: Production Runtime
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy monorepo files
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public

WORKDIR /app/apps/web

# Health check
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-3000} || exit 1

# Expose port
EXPOSE ${PORT:-3000}

# Start application
CMD ["pnpm", "start"]
