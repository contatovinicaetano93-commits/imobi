# Workflow & Deployment Strategy — imbobi

**Last Updated**: 2026-06-03  
**Status**: ACTIVE  
**Owner**: Engineering Team

---

## Executive Summary

This document defines the complete CI/CD workflow from feature development through production deployment for the imbobi platform. We follow a **three-tier branching strategy** with automated checks and selective deployments:

```
develop ─→ feature/* (auto-delete after PR merge)
   ↓
main (staging) ─→ Auto-deploy to Vercel + Render
   ↓ (manual trigger)
production ─→ Manual deployment to ECS Fargate + RDS (Phase 2)
```

---

## Branch Strategy

### 1. Develop Branch (Integration Hub)
- **Purpose**: Integration point for feature branches before staging
- **Merge Rules**:
  - All PRs must pass CI checks (type-check, build, lint)
  - Minimum 1 approved review required
  - No direct commits (always via PR)
  - Auto-delete feature branches after merge (GitHub setting enabled)
- **Deployment**: No automatic deployment (integration only)

### 2. Feature Branches
- **Naming**: `feature/<ticket-id>-<short-description>`
  - Examples: `feature/IMBOBI-123-auth-mfa`, `feature/IMBOBI-456-kyc-validation`
- **Creation**:
  ```bash
  git checkout -b feature/IMBOBI-XXX-description develop
  ```
- **Workflow**:
  1. Create branch from `develop`
  2. Commit changes with conventional commit format:
     - `feat(module): description`
     - `fix(module): description`
     - `refactor(module): description`
  3. Push to GitHub: `git push origin feature/IMBOBI-XXX-description`
  4. Create Pull Request to `develop`
  5. Wait for all checks to pass
  6. Request review from team
  7. Merge (auto-delete enabled)
- **Pre-Push Checks** (Local):
  ```bash
  pnpm type-check  # TypeScript strict mode
  pnpm lint        # ESLint + Prettier
  pnpm build       # Production build validation
  ```

### 3. Main Branch (Staging)
- **Purpose**: Staging environment — represents next release candidate
- **Merge Rules**:
  - Accepts only from develop (via PR)
  - All CI checks must pass
  - Tag releases on main: `git tag v0.x.y`
- **Deployment**: Automatic on push
  - Vercel: Frontend to `https://imobi-staging.vercel.app`
  - Render: Backend to `https://imobi-api-staging.onrender.com`

### 4. Production Branch (Optional, Phase 2)
- **Purpose**: Explicit production release tag/branch
- **Creation**:
  ```bash
  git tag v1.0.0 main  # Tag on main
  git push origin v1.0.0
  ```
- **Deployment**: Manual (GitHub Actions or manual Terraform)
  - ECS Fargate: Backend to `https://api.imobi.com` (Phase 2)
  - CloudFront/S3: Frontend (Phase 2)
  - RDS + ElastiCache: Auto-managed

---

## CI/CD Pipeline

### Stage 1: Local Development (Pre-Push)

**What runs locally** (via git hooks):
```bash
pnpm type-check     # TypeScript compilation
pnpm lint           # ESLint + Prettier checks
pnpm build          # Full monorepo build
```

**Command to run manually**:
```bash
# Full CI simulation locally
pnpm type-check && pnpm lint && pnpm build
```

**Push** if all pass:
```bash
git push origin feature/IMBOBI-XXX-description
```

---

### Stage 2: GitHub Actions CI (Pull Request)

**Trigger**: Push to `develop` or `main`, or PR to either

**Workflow File**: `.github/workflows/ci.yml`

**Jobs** (run in parallel):

#### Job 1: Type Check
- Runs: `pnpm type-check`
- Validates TypeScript in all packages
- Duration: ~30 seconds
- Failure: PR cannot be merged

#### Job 2: Build
- Runs: `pnpm build`
- Builds all packages (web, api, shared)
- Generates: `.next`, `dist/` directories
- Uploads artifacts (retention: 1 day)
- Duration: ~2 minutes
- Failure: PR cannot be merged

#### Job 3: E2E Tests (Optional on develop/main)
- Runs: Jest + Supertest critical flows
- Services: PostgreSQL + PostGIS + Redis (Docker)
- Tests: `critical-flows.e2e.spec.ts`
- Duration: ~3-5 minutes
- Failure: PR cannot be merged

**Example Status Check**:
```
✅ type-check (30s)
✅ build (2m)
✅ E2E tests (4m)
Ready to merge
```

---

### Stage 3: Staging Deployment (Automatic on main push)

**Trigger**: Push to `main` branch or PR merge to `main`

**Workflow**: Vercel + Render auto-deployment via GitHub integration

#### Frontend → Vercel
- **URL**: `https://imobi-staging.vercel.app`
- **Steps**:
  1. Vercel detects push to `main`
  2. Installs dependencies: `pnpm install --frozen-lockfile`
  3. Builds: `pnpm -F @imbobi/web build`
  4. Deploys to Vercel's edge network
  5. Runs health check: `curl imobi-staging.vercel.app/`
- **Duration**: ~3-5 minutes
- **Status**: Check Vercel dashboard or GitHub commit status

#### Backend → Render
- **URL**: `https://imobi-api-staging.onrender.com`
- **Steps**:
  1. Render detects push to `main`
  2. Installs: `pnpm install --frozen-lockfile`
  3. Builds: `pnpm -F @imbobi/api build`
  4. Runs migrations: `npx prisma migrate deploy`
  5. Starts NestJS server on port 4000
  6. Runs health check: `curl imobi-api-staging.onrender.com/health`
- **Duration**: ~5-8 minutes
- **Status**: Check Render dashboard or GitHub Actions logs

**Verification Steps**:
```bash
# Frontend
curl -s https://imobi-staging.vercel.app/ | grep -q "imobi" && echo "✅ Web OK"

# Backend
curl -s https://imobi-api-staging.onrender.com/health | jq .

# Test Login Flow
curl -X POST https://imobi-api-staging.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

### Stage 4: Production Deployment (Manual, Phase 2)

**Trigger**: `git tag v1.x.x main` + GitHub Actions workflow dispatch

**Pre-Deployment Checklist**:
- ✅ All tests passing on main
- ✅ Security scan completed (no high-severity vulnerabilities)
- ✅ Performance baseline validated (p95 < 1000ms)
- ✅ Database migrations reviewed and tested
- ✅ Environment variables configured in Terraform
- ✅ Stakeholder sign-off obtained

**Deployment Steps** (Phase 2 with Terraform):

#### Step 1: Create Production Tag
```bash
git tag -a v1.0.0 -m "Release v1.0.0 - [feature list]" main
git push origin v1.0.0
```

#### Step 2: Trigger GitHub Actions (Manual Dispatch)
Option A: Via GitHub UI
- Go to Actions → Production Deployment
- Click "Run workflow"
- Select tag `v1.0.0`
- Wait for deployment

Option B: Via CLI (if webhook configured)
```bash
# Automatically triggered on tag push
# Monitor progress: GitHub Actions tab
```

#### Step 3: Terraform Apply (ECS Fargate)
```bash
cd infrastructure/terraform
terraform plan -var="version=v1.0.0"  # Review changes
terraform apply -auto-approve -var="version=v1.0.0"
```

This deploys:
- **ECS Task**: NestJS API container → Fargate
- **RDS**: PostgreSQL database (if new)
- **ElastiCache**: Redis cluster (if new)
- **ALB**: Load balancer for ECS
- **CloudFront**: CDN for static assets

#### Step 4: Health Checks & Monitoring
```bash
# Health check
curl -s https://api.imobi.com/health | jq .

# Monitor logs (CloudWatch)
aws logs tail /ecs/imbobi-api --follow

# Monitor metrics (CloudWatch)
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=imbobi-api
```

#### Step 5: Smoke Tests (Post-Deploy)
Run all checks from `DEPLOYMENT_CHECKLIST.md`:
```bash
# See Smoke Test Checklist section below
```

#### Step 6: Monitor for 24 Hours
- Track error rate (target: <0.1%)
- Monitor API response times (p95 < 1000ms)
- Check database connection pool
- Verify cache hit rates (target: >80%)
- Monitor memory/CPU on ECS

**Rollback Plan** (if issues occur):
```bash
# Quick rollback to previous tag
git tag v1.0.1-hotfix main  # Create hotfix
git push origin v1.0.1-hotfix
terraform apply -auto-approve -var="version=v1.0.1-hotfix"

# OR revert to v1.0.0
terraform apply -auto-approve -var="version=v1.0.0"
```

---

## Environment Configuration

### Development (Local)
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:test@localhost:5432/imbobi_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key
API_URL=http://localhost:4000
WEB_URL=http://localhost:3000
```

### Staging (Render + Vercel)
```env
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@staging-db.onrender.com:5432/imbobi_staging
REDIS_URL=redis://staging-cache.onrender.com:6379
JWT_SECRET=<generated-secret>
API_URL=https://imobi-api-staging.onrender.com
WEB_URL=https://imobi-staging.vercel.app
```

### Production (Phase 2: ECS + RDS + ElastiCache)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@imbobi-rds.xxxx.us-east-1.rds.amazonaws.com:5432/imbobi
REDIS_URL=redis://imbobi-cache.xxxx.ng.0001.use1.cache.amazonaws.com:6379
JWT_SECRET=<generated-secret>
API_URL=https://api.imobi.com
WEB_URL=https://imobi.com
```

---

## CI/CD Tools & Integrations

| Tool | Purpose | Config |
|------|---------|--------|
| **GitHub** | Repository + PR management | Default |
| **GitHub Actions** | CI/CD automation | `.github/workflows/` |
| **Vercel** | Frontend deployment (staging + prod) | Vercel dashboard |
| **Render** | Backend staging deployment | Render dashboard |
| **Terraform** | Infrastructure as Code (Phase 2) | `infrastructure/terraform/` |
| **PostgreSQL** | Primary database | RDS (Phase 2) |
| **Redis** | Cache + sessions | ElastiCache (Phase 2) |
| **CloudWatch** | Observability (Phase 2) | AWS console |
| **X-Ray** | Distributed tracing (Phase 2) | AWS console |

---

## Deployment Checklist

See detailed checklist in `DEPLOYMENT_CHECKLIST.md`.

### Pre-Deployment (24 hours before)
- [ ] All PRs merged to main
- [ ] Tests passing on main branch
- [ ] Code review completed
- [ ] Security scan passed (no high-severity issues)
- [ ] Performance validated (load tests passed)
- [ ] Database migrations reviewed
- [ ] Environment variables prepared
- [ ] Stakeholder sign-offs obtained

### During Deployment (Monitoring)
- [ ] Watch GitHub Actions logs for errors
- [ ] Monitor Render/Vercel deployment progress
- [ ] Verify database migrations applied
- [ ] Check cloud infrastructure provisioning
- [ ] Confirm health checks passing

### Post-Deployment (24 hours)
- [ ] Smoke tests all passing
- [ ] Error rate < 0.1%
- [ ] Response time p95 < 1000ms
- [ ] Cache hit rate > 80%
- [ ] Database connections normal
- [ ] User can complete critical flows
- [ ] Email notifications working
- [ ] File uploads to S3 working

### Rollback Triggers
- Error rate > 1% sustained
- Response time p95 > 2000ms sustained
- Database connection failures
- Cache service unavailable
- Critical security vulnerability discovered

---

## Smoke Test Checklist (Post-Deploy)

Execute after **each deployment** (staging or production):

### Authentication
```bash
# Login
curl -X POST https://api.imobi-staging.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# Expected: 200 OK + tokens

# Refresh token
curl -X POST https://api.imobi-staging.onrender.com/api/v1/auth/refresh \
  -H "Authorization: Bearer <refresh_token>"
# Expected: 200 OK + new tokens
```

### User Profile
```bash
# Get profile (requires valid JWT)
curl -X GET https://api.imobi-staging.onrender.com/api/v1/usuarios/meu-perfil \
  -H "Authorization: Bearer <access_token>"
# Expected: 200 OK + user data
```

### Health Checks
```bash
# API health
curl https://imobi-api-staging.onrender.com/health | jq .
# Expected: 200 OK + { "status": "ok" }

# Web health
curl https://imobi-staging.vercel.app/ | grep -q "imobi"
# Expected: 200 OK + HTML content
```

### Database Connectivity
```bash
# Check via API logs (Render dashboard)
# Should see: "Database connected successfully"
# Should NOT see: "Connection timeout" or "ECONNREFUSED"
```

### Redis/Cache
```bash
# Check via API logs
# Should see: "Redis cache initialized"
# Should NOT see: "Redis connection failed"
```

### File Upload (S3)
```bash
# Test image upload to obra
curl -X POST https://api.imobi-staging.onrender.com/api/v1/obras/123/evidencias \
  -F "file=@test-image.jpg" \
  -H "Authorization: Bearer <access_token>"
# Expected: 200 OK + S3 file URL
```

---

## Hotfix Process

For critical bugs in production:

### 1. Create Hotfix Branch
```bash
git checkout -b hotfix/IMBOBI-XXX main
# Make fix
git commit -m "fix: critical bug description"
```

### 2. Test in Staging
```bash
# Push to staging first
git push origin hotfix/IMBOBI-XXX:main  # temporary
# Run full smoke tests
# If verified, revert and proceed to production
```

### 3. Deploy to Production
```bash
# Create hotfix tag
git tag -a v1.0.1 -m "Hotfix: [description]" main
git push origin v1.0.1

# Apply Terraform (Phase 2)
terraform apply -auto-approve -var="version=v1.0.1"
```

### 4. Monitor & Document
- Monitor error rate for 24 hours
- Document root cause
- Plan permanent fix for next release

---

## Monitoring & Alerting

### Real-Time Dashboards

**Vercel (Frontend)**
- URL: https://vercel.com/imbobi
- Metrics: Build time, response times, error rates
- Alerts: Auto-configured

**Render (Staging Backend)**
- URL: https://dashboard.render.com
- Metrics: CPU, memory, response times
- Logs: Available via dashboard

**CloudWatch (Phase 2 Production)**
- URL: https://console.aws.amazon.com/cloudwatch
- Metrics: ECS, RDS, ElastiCache, ALB
- Dashboards: Custom per service

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Error Rate | <0.1% | >1% (sustained 5 min) |
| API Response Time (p95) | <500ms | >1000ms (sustained 5 min) |
| Database Connections | <80% pool | >90% |
| Redis Memory | <80% | >90% |
| ECS CPU (Phase 2) | <70% | >90% |
| ECS Memory (Phase 2) | <80% | >95% |

### Alert Channels
- **Slack**: #imbobi-deployments (auto)
- **Email**: contato.vinicaetano93@gmail.com
- **PagerDuty**: On-call engineer (Phase 2)

---

## Git Workflow Examples

### Example 1: Feature Development & Merge
```bash
# 1. Create feature branch
git checkout -b feature/IMBOBI-123-auth-mfa develop
git add src/auth/mfa.ts
git commit -m "feat(auth): add two-factor authentication"

# 2. Pre-push checks (local)
pnpm type-check && pnpm lint && pnpm build

# 3. Push & create PR
git push origin feature/IMBOBI-123-auth-mfa
# Create PR via GitHub UI

# 4. After approval & CI pass: Merge
# GitHub auto-deletes branch
```

### Example 2: Staging Deployment
```bash
# 1. Merge PR to develop (already done above)

# 2. Create staging release
git checkout main
git merge develop  # or use PR
git tag v0.5.0 -m "Staging release - MFA feature"
git push origin main
git push origin v0.5.0

# 3. Auto-deployment
# Vercel + Render auto-deploy on tag
# Monitor: Vercel dashboard + Render dashboard

# 4. Run smoke tests
curl https://imobi-staging.vercel.app/
curl https://imobi-api-staging.onrender.com/health
```

### Example 3: Production Deployment (Phase 2)
```bash
# 1. Tag production release
git tag -a v1.0.0 -m "Production release - Ready for cutover" main
git push origin v1.0.0

# 2. Deploy via Terraform
cd infrastructure/terraform
terraform apply -auto-approve -var="version=v1.0.0"

# 3. Verify health
curl https://api.imobi.com/health
curl https://imobi.com/

# 4. Monitor CloudWatch for 24 hours
aws logs tail /ecs/imbobi-api --follow
```

### Example 4: Hotfix
```bash
# 1. Create hotfix
git checkout -b hotfix/IMBOBI-456-critical-bug main
git add src/critical.ts
git commit -m "fix: critical security vulnerability"

# 2. Tag hotfix
git tag -a v1.0.1 -m "Hotfix: security vulnerability" main
git push origin v1.0.1

# 3. Deploy
cd infrastructure/terraform
terraform apply -auto-approve -var="version=v1.0.1"

# 4. Document incident
# File GitHub issue with root cause analysis
```

---

## Frequently Asked Questions

### Q: Can I push directly to main?
**A**: No. All changes require a PR with approved reviews and passing CI checks. This ensures code quality and auditability.

### Q: How do I run CI checks locally?
**A**:
```bash
pnpm type-check     # Type-check all packages
pnpm lint           # Lint all files
pnpm build          # Build all packages
pnpm test           # Run unit tests (if configured)
```

### Q: What if my PR has conflicts?
**A**: Resolve conflicts locally, commit, and push:
```bash
git pull origin develop          # Get latest
# Fix conflicts in your editor
git add .
git commit -m "chore: resolve merge conflicts"
git push origin feature/IMBOBI-XXX
```

### Q: How do I rollback a staging deployment?
**A**: Revert the commit on `main`:
```bash
git revert <commit-sha>  # Creates new commit
git push origin main     # Vercel auto-deploys
```

### Q: How do I rollback a production deployment (Phase 2)?
**A**: Revert the Terraform state:
```bash
cd infrastructure/terraform
# Option 1: Revert to previous tag
terraform apply -auto-approve -var="version=v1.0.0"

# Option 2: Revert commit and re-apply
git revert <commit-sha>
terraform apply -auto-approve
```

### Q: What if a test fails on the PR?
**A**: 
1. View error in GitHub Actions logs
2. Reproduce locally: `pnpm test -- <test-file>`
3. Fix the issue
4. Commit & push: `git push origin feature/IMBOBI-XXX`
5. CI runs again automatically

### Q: Can I merge a PR with failing checks?
**A**: No. GitHub branch protection rules prevent merging. All checks must pass.

### Q: How do I skip a check (emergency only)?
**A**: Consult with tech lead. May require:
1. Disabling branch protection (temporary)
2. Manual approval
3. Post-deployment verification

---

## Phase 2 Roadmap (ECS Fargate + RDS)

**Timeline**: 6-12 months from MVP

**Infrastructure Changes**:
- Replace Render with ECS Fargate + ALB (40% cost reduction)
- Replace local PostgreSQL with RDS (managed, backups, multi-AZ)
- Replace local Redis with ElastiCache (managed, auto-failover)
- Add CloudWatch + X-Ray (replace Sentry, save 50%)
- Add Terraform state management (S3 + DynamoDB lock)

**Workflow Changes**:
- Deployment trigger: `git tag v1.x.x` → GitHub Actions → Terraform
- Infrastructure as Code: All provisioning via Terraform
- Monitoring: CloudWatch dashboards + auto-scaling policies
- Backup: RDS automated backups, S3 versioning

**New Files to Create**:
- `infrastructure/terraform/main.tf` (ECS + RDS + ElastiCache)
- `infrastructure/terraform/variables.tf` (environment variables)
- `infrastructure/terraform/outputs.tf` (API gateway URL, RDS endpoint)
- `.github/workflows/deploy-production.yml` (Terraform apply)

---

## Support & Troubleshooting

**CI Pipeline Issues**:
- Check GitHub Actions tab for logs
- Reproduce locally: `pnpm type-check && pnpm build`
- Common fixes: `pnpm install`, `pnpm db:generate`, clear `.next`

**Deployment Issues**:
- Vercel: Check https://vercel.com/imbobi → Deployments
- Render: Check https://dashboard.render.com → Deployments
- Logs: Render dashboard → Logs, Vercel dashboard → Logs

**Database Issues**:
- Test connection: `psql $DATABASE_URL`
- Check migrations: `npx prisma migrate status`
- Rollback migration: `npx prisma migrate resolve --rolled-back <name>`

**Redis Issues**:
- Test connection: `redis-cli -u $REDIS_URL ping`
- Clear cache (staging only): `redis-cli -u $REDIS_URL FLUSHALL`
- Monitor keys: `redis-cli -u $REDIS_URL --scan`

**Support Contact**:
- Email: contato.vinicaetano93@gmail.com
- Slack: #imbobi-engineering
- GitHub: File issue with `[workflow]` tag

---

**Approved By**: Engineering Team  
**Last Review**: 2026-06-03  
**Next Review**: 2026-09-03 (quarterly)
