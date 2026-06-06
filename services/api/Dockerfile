FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY services/api/ ./services/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @imbobi/schemas build || true
RUN pnpm --filter @imbobi/core build
RUN pnpm --filter @imbobi/api run prisma:generate
RUN pnpm --filter @imbobi/api build

# ── Runtime ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm@9

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/services/api/package.json ./services/api/
COPY --from=builder /app/services/api/dist/ ./services/api/dist/
COPY --from=builder /app/services/api/prisma/ ./services/api/prisma/

RUN pnpm install --frozen-lockfile --prod
RUN pnpm --filter @imbobi/api run prisma:generate

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter @imbobi/api start"]
