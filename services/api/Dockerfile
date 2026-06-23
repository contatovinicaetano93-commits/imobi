FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl \
  && npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY packages/ ./packages/
COPY services/api/ ./services/api/

# Render injects NODE_ENV=production during build; devDeps are required for nest/tsc.
ENV NODE_ENV=development

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @imbobi/schemas build \
  && pnpm --filter @imbobi/core build

WORKDIR /app/services/api
RUN pnpm exec prisma generate --schema prisma/schema.prisma \
  && pnpm exec nest build \
  && test -f dist/main.js

WORKDIR /app
ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "cd /app/services/api && node ./scripts/railway-start.mjs"]
