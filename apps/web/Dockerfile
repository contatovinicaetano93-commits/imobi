# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml .
COPY package.json .
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build Next.js
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @imbobi/web build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prod

# Copy Next.js build
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.js ./apps/web/
COPY --from=builder /app/packages/schemas ./packages/schemas

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start"]
