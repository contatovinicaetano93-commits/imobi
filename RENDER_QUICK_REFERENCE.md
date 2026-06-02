# imobi — Render Deployment Quick Reference

**Quick setup checklist and command reference for PostgreSQL + Redis on Render**

---

## 1-Minute Setup Summary

```bash
# 1. Create PostgreSQL 14+ on Render
# 2. Create Redis 7+ on Render
# 3. Copy connection strings to Render environment variables
# 4. Deploy API service to Render
# 5. Run migrations from API service shell
```

---

## Connection Strings

### PostgreSQL
```
postgresql://imbobi_staging:password@dpg-xxx.postgres.render.com:5432/imobi_staging
```
**Render Variable**: `DATABASE_URL`

### Redis
```
redis://:cA3xL9pK2mQ5vN1x@dpg-xxx.redis.render.com:6379
```
**Render Variables**:
- `REDIS_HOST` = `dpg-xxx.redis.render.com`
- `REDIS_PORT` = `6379`
- `REDIS_PASSWORD` = `cA3xL9pK2mQ5vN1x`

---

## Environment Variables (Render Dashboard)

**API Service → Environment**

| Variable | Value | Generate/Source |
|----------|-------|---|
| `NODE_ENV` | `staging` | Manual |
| `PORT` | `4000` | Manual |
| `DATABASE_URL` | `postgresql://...` | From Render PostgreSQL |
| `REDIS_HOST` | `dpg-xxx.redis.render.com` | From Render Redis |
| `REDIS_PORT` | `6379` | From Render Redis |
| `REDIS_PASSWORD` | `...` | From Render Redis |
| `JWT_SECRET` | _(64+ char base64)_ | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `ENCRYPTION_KEY` | _(32 byte base64)_ | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CORS_ORIGIN` | `https://web-staging.imobi.com` | Manual |
| `AWS_REGION` | `us-east-1` | Manual |
| `AWS_ACCESS_KEY_ID` | `...` | AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | `...` | AWS IAM |
| `AWS_S3_BUCKET` | `imobi-staging-assets` | Manual |

---

## Commands (After API Service Deployed)

### Run Migrations
```bash
# Via Render service shell or deploy command
DATABASE_URL="postgresql://..." pnpm db:migrate
```

### Generate Prisma Client
```bash
pnpm db:generate
```

### Open Prisma Studio
```bash
DATABASE_URL="postgresql://..." pnpm prisma:studio
```

### Seed Test Data (Optional)
```bash
pnpm --filter @imbobi/api seed
```

---

## Verification

### Check API Health
```bash
curl https://api-staging.imobi.com/health
```

### Test Database Connection
```bash
psql postgresql://imbobi_staging:password@dpg-xxx.postgres.render.com:5432/imobi_staging -c "\dt"
```

### View API Logs
Render Dashboard → Service → Logs → Search for:
- `"Database connected"`
- `"Redis connected"`
- Connection errors

---

## Tables Created

```
Usuario, SessaoToken, UsuarioFcmToken
Credito, LiberacaoParcela
Obra, EtapaObra, EvidenciaEtapa
KycDocumento
Notificacao
ScoreHistorico
JobFalha
AnalyticsEvent
```

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Connection refused | Database URL correct? Database available? |
| Migration failed | USER has CREATE privilege? DATABASE_URL set? |
| Redis timeout | REDIS_HOST/PORT/PASSWORD correct? Instance available? |
| Out of memory | Increase Redis/PostgreSQL instance size |

---

## Files Referenced

- Schema: `/services/api/prisma/schema.prisma`
- Migrations: `/services/api/prisma/migrations/`
- App Module: `/services/api/src/app.module.ts`
- Config: `/services/api/.env.example`

---

## Important Links

- Full Guide: `RENDER_DEPLOYMENT_SETUP.md`
- Render Dashboard: https://dashboard.render.com
- Prisma Docs: https://www.prisma.io/docs/
- Render PostgreSQL: https://render.com/docs/databases
- Render Redis: https://render.com/docs/redis

---

**Created**: 2026-06-02  
**For**: imobi Staging Deployment on Render
