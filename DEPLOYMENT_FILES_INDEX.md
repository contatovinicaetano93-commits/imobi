# imobi Staging Deployment - Files Index

## Quick Navigation

### Configuration Files
- **`.env.staging`** - Environment variables for staging deployment (67 variables configured)
  - Location: `/home/user/imobi/.env.staging`
  - JWT_SECRET: ✅ 64 chars (validated)
  - ENCRYPTION_KEY: ✅ 32 bytes base64 (validated)
  - Database URL, Redis, S3 credentials configured

- **`.env.staging.example`** - Template with all environment variables documented
  - Location: `/home/user/imobi/.env.staging.example`
  - Use as reference for variable meanings

### Documentation Files
- **`STAGING_DEPLOYMENT_READY.md`** - Complete deployment guide
  - Location: `/home/user/imobi/STAGING_DEPLOYMENT_READY.md`
  - Covers: environment setup, build verification, database config, infrastructure checklist
  - Includes: deployment commands, security validation, troubleshooting

- **`DEPLOYMENT_FILES_INDEX.md`** - This file
  - Navigation guide for deployment-related files

- **`CLAUDE.md`** - Project architecture overview
  - Location: `/home/user/imobi/CLAUDE.md`
  - Stack overview: Turborepo, Next.js, NestJS, Expo, PostgreSQL, Redis

### Scripts
- **`scripts/verify-staging-deployment.sh`** - Automated verification script
  - Location: `/home/user/imobi/scripts/verify-staging-deployment.sh`
  - Validates: environment, build artifacts, type checking, database connectivity
  - Executable: `bash scripts/verify-staging-deployment.sh`

### Database Files
- **`services/api/prisma/schema.prisma`** - Database schema definition
  - Prisma ORM configuration
  - PostgreSQL + PostGIS setup
  - 10 main entities (Usuario, Obra, Credito, etc.)

- **`services/api/prisma/migrations/`** - Database migration files
  - 6 migrations ready to apply:
    - 0_init
    - 1_add_notifications
    - 2_add_kyc_documents
    - 3_add_performance_indexes
    - 20260529172221_add_analytics_event
    - 20260529224517_add_soft_delete_and_job_falha

### Build Artifacts (After `pnpm build`)
- **`services/api/dist/`** - Compiled NestJS API
  - Generated from: `services/api/`
  - Build command: `pnpm build`

- **`apps/web/.next/`** - Optimized Next.js web app
  - Generated from: `apps/web/`
  - 20 static/dynamic pages optimized

- **`packages/*/dist/`** - Compiled shared packages
  - ui, core, schemas, api-client

---

## Deployment Workflow

### 1. Pre-Deployment Verification
```bash
bash scripts/verify-staging-deployment.sh
```
Verifies:
- Environment configuration ✅
- Build artifacts ✅
- Type checking ✅
- Database connectivity (manual)
- Redis connectivity (manual)

### 2. Infrastructure Setup (Manual)
```bash
# PostgreSQL
createdb imobi_staging
psql imobi_staging -c "CREATE EXTENSION postgis;"

# Redis
redis-server --port 6380

# S3/MinIO (if local)
minio server /data
```

### 3. Database Setup
```bash
pnpm db:generate
pnpm db:migrate
```

### 4. Start Services
```bash
pnpm dev  # Development mode
# OR
./DEPLOY.sh  # Production mode
```

---

## File Structure Overview

```
/home/user/imobi/
├── .env.staging                          # Staging environment variables (CONFIGURED)
├── .env.staging.example                  # Environment variable template
├── STAGING_DEPLOYMENT_READY.md           # Deployment guide (11KB)
├── DEPLOYMENT_FILES_INDEX.md             # This file (navigation guide)
├── CLAUDE.md                             # Project architecture
├── pnpm-workspace.yaml                   # Monorepo workspace config
├── package.json                          # Root scripts (build, dev, type-check)
│
├── scripts/
│   ├── verify-staging-deployment.sh      # Verification script (7.3KB, executable)
│   └── ... other scripts
│
├── services/
│   └── api/
│       ├── prisma/
│       │   ├── schema.prisma             # Database schema (Prisma ORM)
│       │   ├── migrations/               # 6 migrations prepared
│       │   └── migration_lock.toml
│       ├── dist/                         # Compiled NestJS (after build)
│       └── src/                          # API source code
│
├── apps/
│   ├── web/
│   │   ├── .next/                        # Next.js build (after build)
│   │   └── src/                          # Web app source
│   └── mobile/
│       └── src/                          # Mobile/Expo source
│
├── packages/
│   ├── schemas/                          # Zod validation schemas
│   ├── core/                             # Shared utilities
│   ├── ui/                               # React components
│   └── api-client/                       # API client library
│
└── node_modules/                         # Installed dependencies
```

---

## Key Files for Different Roles

### DevOps / Deployment Team
- **Primary**: `STAGING_DEPLOYMENT_READY.md` - Full deployment guide
- **Reference**: `services/api/prisma/migrations/` - Understand schema changes
- **Verification**: `scripts/verify-staging-deployment.sh` - Automated checks
- **Config**: `.env.staging` - Environment variables

### Backend Developers
- **Schema**: `services/api/prisma/schema.prisma` - Data model
- **Migrations**: `services/api/prisma/migrations/` - Migration history
- **Config**: `.env.staging` - Database/Redis/S3 settings

### Frontend Developers
- **Config**: `.env.staging` - API URL settings
- **Build**: `apps/web/.next/` - Next.js output (after build)
- **Scripts**: `pnpm dev`, `pnpm build` - Build commands

### DevSecOps
- **Security**: `STAGING_DEPLOYMENT_READY.md` (Section 7) - Security checklist
- **Config**: `.env.staging` - Credential configuration
- **Verification**: `scripts/verify-staging-deployment.sh` - Automated checks

---

## Important URLs & Connections

### Development Services
- **Web**: http://localhost:3000
- **API**: http://localhost:4000
- **Mobile**: http://localhost:8081 (Expo)

### Infrastructure (Staging)
- **PostgreSQL**: postgres:5432
  - Database: imobi_staging
  - User: imobi
  - Password: staging_password

- **Redis**: localhost:6380
  - Password: (empty, acceptable for staging)

- **S3/MinIO**: minio:9000
  - Access Key: minioadmin
  - Secret Key: minioadmin
  - Bucket: imobi-staging
  - Public URL: http://localhost:9000/imobi-staging

---

## Status Summary

| Component | Status | File/Location |
|-----------|--------|--------------|
| Environment Config | ✅ Ready | .env.staging |
| Type Checking | ✅ Pass | All packages |
| Build Artifacts | ✅ Generated | services/api/dist, apps/web/.next |
| Database Schema | ✅ Prepared | services/api/prisma/schema.prisma |
| Migrations | ✅ Ready | services/api/prisma/migrations/ |
| Deployment Guide | ✅ Complete | STAGING_DEPLOYMENT_READY.md |
| Verification Script | ✅ Ready | scripts/verify-staging-deployment.sh |
| Documentation | ✅ Complete | Multiple files |

---

## Next Steps

1. **Infrastructure Setup** - Set up PostgreSQL, Redis, MinIO
2. **Database Migration** - Run `pnpm db:migrate`
3. **Service Launch** - Run `pnpm dev` or `./DEPLOY.sh`
4. **Verification** - Test health endpoints and user flows
5. **Monitoring** - Set up logs and alerts

---

## Support

- **Documentation**: Read `STAGING_DEPLOYMENT_READY.md` for complete guide
- **Verification**: Run `scripts/verify-staging-deployment.sh` to check status
- **Issues**: Check troubleshooting section in `STAGING_DEPLOYMENT_READY.md`
- **Contact**: contato.vinicaetano93@gmail.com

---

Generated: 2026-05-30  
Status: ✅ READY FOR DEPLOYMENT
