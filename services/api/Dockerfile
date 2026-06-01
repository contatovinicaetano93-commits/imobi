# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml .
COPY package.json .
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm --filter @imbobi/api build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/services/api/dist ./services/api/dist

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 4000

CMD ["node", "dist/services/api/src/main.js"]
