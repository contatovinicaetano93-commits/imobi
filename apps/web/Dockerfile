# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/web ./apps/web
COPY tsconfig.json ./

# Build
RUN pnpm --filter @imbobi/web build

# Runtime stage
FROM node:20-alpine AS runtime

WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY apps/web/next.config.js ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["pnpm", "--filter", "@imbobi/web", "start"]
