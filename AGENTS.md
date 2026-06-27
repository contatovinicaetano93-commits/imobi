# AGENTS.md

## Cursor Cloud specific instructions

Imobi is a Turborepo + pnpm monorepo (pnpm 9, Node ≥20). Standard commands live in `CLAUDE.md` and root `package.json` scripts — reference those instead of duplicating. This section only captures non-obvious caveats for running/testing in the Cursor Cloud VM.

### Services (local dev)
- `services/api` — NestJS + Fastify API on port **4000** (`pnpm dev:api`). Requires PostgreSQL + Redis. Background workers (BullMQ) run in-process inside the API, not as a separate service.
- `apps/web` — Next.js 14 web app on port **3000** (`pnpm dev:web`). Talks to the API via `NEXT_PUBLIC_API_URL`.
- `apps/mobile` — Expo app (optional, secondary client).
- `pnpm dev` builds `@imbobi/schemas` + `@imbobi/core` then runs web + api together.

### Startup (per session — these are NOT in the update script)
1. **Docker has no systemd in this VM.** Start the daemon manually once per session and wait a few seconds:
   `sudo dockerd > /tmp/dockerd.log 2>&1 &`
   The `ubuntu` user is in the `docker` group; if you hit a socket permission error after a fresh `dockerd`, run `sudo chmod 666 /var/run/docker.sock`.
2. **Bring up Postgres + Redis + migrations + seed:** `pnpm db:setup` (uses `docker-compose.yml`; idempotent). Use `pnpm db:setup -- --fresh` to recreate volumes.
3. Env files are required and gitignored — copy them if missing:
   `cp services/api/.env.local.example services/api/.env.local`
   `cp apps/web/.env.local.example apps/web/.env.local`
4. Start the app: `pnpm dev`.

Health check: `curl -s http://localhost:4000/api/v1/health` should return `{"status":"ok",...,"redis":{"status":"connected"},"database":{"configured":true}}`.

### Seeded dev accounts (from `pnpm db:setup` / `seed:dev`)
`admin@imobi.com.br / Admin@123`, `gestor@imobi.com.br / Gestor@123`, `eng@imobi.com.br / Eng@123`, `comercial@imobi.com.br / Comercial@123`, `tomador@imobi.com.br / Tomador@123`.

### IMPORTANT login gotcha (browser hangs ~90s)
The web login page (`apps/web/lib/wake-staging-api.ts`) pings the **paused production** Render URL `https://imobi-api-efgg.onrender.com` (and staging) with **no timeout** *before* attempting login. That paused host holds the connection open, so clicking "Login na plataforma" appears to hang ~90s in a real browser even though the local API answers instantly. The staging host and the entire local stack work fine.

For local/automated testing, authenticate against the app's real **server** login endpoint (which proxies to the local API on :4000 and sets the httpOnly session cookie), bypassing only the client-side wake pre-step. From the browser console on `http://localhost:3000`:
```js
await fetch('/web-api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({email:'tomador@imobi.com.br',senha:'Tomador@123'})}).then(r=>r.json())
```
Then navigate to `/dashboard/kyc` (works) — the session cookie is honored by the Next.js middleware. Note: editing `/etc/hosts` in this VM does NOT fix the hang because the GUI browser runs in a separate network namespace.

### Testing notes
- **Unit tests:** use the granular targets in root `package.json` (`pnpm test:jornada:api`, `test:kyc:api`, `test:credito:api`, etc.). They pass standalone.
- `pnpm --filter @imbobi/api test` (full Jest) and `pnpm test` (turbo → Playwright e2e) include **integration/e2e specs that require a fully running app and/or Playwright browsers** (`pnpm --filter @imbobi/e2e exec playwright install`); many fail with 404s when run in isolation. This is expected — they are not pure unit tests.
- **Type-check:** `api`, `web`, `core`, `schemas` pass. `apps/mobile` has a pre-existing failure (`app.config.ts`: `deploymentTarget`).
- **Lint:** 4/5 packages pass. `@imbobi/web` reports 2 pre-existing errors (`Definition for rule 'react-hooks/exhaustive-deps' was not found`, from stale inline disable comments — the `react-hooks` plugin isn't configured) plus several warnings.
- `/dashboard/construtor` (the tomador role-home) currently throws a client-side React Server Component error in dev ("Functions cannot be passed directly to Client Components"); it returns 200 server-side. `/dashboard/kyc` and other dashboard routes render fine. This is a pre-existing app issue, unrelated to environment setup.
