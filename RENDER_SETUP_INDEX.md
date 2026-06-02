# imobi — Render Deployment Documentation Index

**Complete guide collection for PostgreSQL + Redis setup on Render**

---

## Quick Navigation

### For First-Time Setup (Start Here)
1. **RENDER_STEP_BY_STEP.md** ← START HERE
   - Visual walkthrough with screenshots
   - Click-by-click instructions for Render UI
   - 20-30 minutes total time

### For Reference During Deployment
2. **RENDER_QUICK_REFERENCE.md**
   - One-page cheat sheet
   - Connection string templates
   - Common commands
   - Quick troubleshooting

### For Comprehensive Understanding
3. **RENDER_DEPLOYMENT_SETUP.md**
   - Complete technical guide
   - All configuration options
   - Security best practices
   - Monitoring and alerts
   - Backup & recovery procedures

### For Technical Details
4. **RENDER_TECHNICAL_CONFIG.md**
   - Database schema details
   - Performance tuning
   - Network configuration
   - Cost estimation
   - Version constraints

### For Command Line Work
5. **RENDER_DEPLOYMENT_COMMANDS.sh**
   - Shell functions for automation
   - Testing and verification commands
   - Backup/restore procedures
   - Monitoring scripts
   - Full deployment checklist

---

## What Each Document Covers

### RENDER_STEP_BY_STEP.md
**Best for**: Visual learners, first-time setup
**Time**: 20-30 minutes
**Contents**:
- Step-by-step UI instructions
- Part 1: PostgreSQL setup
- Part 2: Redis setup
- Part 3: API service deployment
- Part 4: Database migrations
- Part 5: Testing connections
- Part 6: Monitoring setup
- Part 7: Web service deployment
- Completion checklist

**When to use**: Starting fresh with Render

### RENDER_QUICK_REFERENCE.md
**Best for**: Quick lookup, cheat sheet
**Time**: 1-2 minutes to find what you need
**Contents**:
- 1-minute setup summary
- Connection string formats
- Environment variables table
- Commands for migrations
- Verification steps
- Troubleshooting table
- Files referenced
- Important links

**When to use**: During deployment, remembering commands

### RENDER_DEPLOYMENT_SETUP.md
**Best for**: Comprehensive reference, learning details
**Time**: 30-45 minutes to read fully
**Contents**:
- PostgreSQL setup (7 subsections)
- Redis cache setup (3 subsections)
- Database migration (3 subsections)
- Connection testing (4 tests)
- Environment variables (complete reference table)
- Security best practices (4 categories)
- Monitoring & alerts (2 sections)
- Backup & recovery (4 subsections)
- Complete checklist
- Schema overview
- Support & troubleshooting

**When to use**: Understanding full process, security review, monitoring setup

### RENDER_TECHNICAL_CONFIG.md
**Best for**: Advanced configuration, performance tuning
**Time**: 45-60 minutes to read fully
**Contents**:
- Database configuration specifications
- Redis configuration details
- Network & security configuration
- Database schema details with SQL
- Application configuration (NestJS modules)
- Performance tuning examples
- Monitoring metrics (with thresholds)
- Backup & disaster recovery
- CI/CD integration
- Version constraints
- Cost estimation
- Render service limits

**When to use**: Optimization, performance issues, advanced configuration

### RENDER_DEPLOYMENT_COMMANDS.sh
**Best for**: Automation, scripting, testing
**Time**: Varies by task
**Contents**:
- Generating secrets
- Verifying environment variables
- Database connection testing
- Migration commands
- Prisma Studio
- Seeding test data
- Table verification
- Backup/restore functions
- Health checks
- Monitoring commands
- Cleanup functions
- Deploy commands
- Log viewing hints
- Full deployment checklist
- Help function with examples

**When to use**: Automating tasks, running tests, scripting deployments

---

## Deployment Workflow

### Option A: Manual Setup (Recommended for First-Time)

1. **Read**: RENDER_STEP_BY_STEP.md (20-30 min)
2. **Follow**: Each step with UI instructions
3. **Reference**: RENDER_QUICK_REFERENCE.md (while deploying)
4. **Verify**: Use commands from RENDER_DEPLOYMENT_COMMANDS.sh
5. **Troubleshoot**: Check RENDER_QUICK_REFERENCE.md → Troubleshooting table

### Option B: Fast Setup (If You're Experienced)

1. **Skim**: RENDER_STEP_BY_STEP.md (5 min)
2. **Follow**: RENDER_QUICK_REFERENCE.md (10 min)
3. **Use**: RENDER_DEPLOYMENT_COMMANDS.sh (automate tests)
4. **Reference**: RENDER_DEPLOYMENT_SETUP.md (as needed)

### Option C: Understanding-First (If You're Learning)

1. **Read**: RENDER_DEPLOYMENT_SETUP.md (30-45 min)
2. **Deep dive**: RENDER_TECHNICAL_CONFIG.md (30 min)
3. **Then follow**: RENDER_STEP_BY_STEP.md (20 min)
4. **Automate**: RENDER_DEPLOYMENT_COMMANDS.sh (5 min)

---

## Common Tasks & Where to Find Help

| Task | Document | Section |
|------|----------|---------|
| Create PostgreSQL on Render | STEP_BY_STEP | Part 1 |
| Create Redis on Render | STEP_BY_STEP | Part 2 |
| Get connection strings | QUICK_REFERENCE | Connection Strings |
| Run migrations | STEP_BY_STEP | Part 4 OR COMMANDS |
| Test database connection | COMMANDS | `test_postgres_connection()` |
| Generate JWT_SECRET | COMMANDS | `node -e...` OR QUICK_REF |
| Set up monitoring | STEP_BY_STEP | Part 6 OR SETUP → Monitoring |
| Backup database | COMMANDS | `backup_database()` |
| Restore from backup | COMMANDS | `restore_database_from_backup()` |
| Check database size | COMMANDS | `check_db_size()` |
| View API logs | STEP_BY_STEP | Troubleshooting |
| Understand schema | TECHNICAL_CONFIG | Database Schema Details |
| Performance tuning | TECHNICAL_CONFIG | Performance Tuning |
| Disaster recovery | SETUP | Backup & Recovery |
| Cost estimation | TECHNICAL_CONFIG | Cost Estimation |
| Security review | SETUP | Security Best Practices |

---

## Before You Start

### Prerequisites
- [ ] Render account created (https://render.com)
- [ ] GitHub repository access
- [ ] Node.js 18+ installed locally
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] AWS account (for S3 credentials)
- [ ] Firebase account (optional, for notifications)

### Information to Gather
- [ ] GitHub repository URL
- [ ] AWS region for S3 bucket
- [ ] Domain/region for Render services
- [ ] Email for notifications (optional)

### Security Checklist
- [ ] Never commit `.env` files
- [ ] All secrets stored in Render dashboard only
- [ ] Different secrets for each environment
- [ ] Strong passwords (32+ characters)
- [ ] SSL/TLS enabled (automatic on Render)

---

## Environment Variables Quick Reference

### Required by API Service

```
DATABASE_URL         ← PostgreSQL connection (from Render)
REDIS_HOST          ← Redis host (from Render)
REDIS_PORT          ← Redis port (usually 6379)
REDIS_PASSWORD      ← Redis password (from Render)
JWT_SECRET          ← Generate: node -e "console.log(...)"
ENCRYPTION_KEY      ← Generate: node -e "console.log(...)"
NODE_ENV            ← "staging"
PORT                ← "4000"
CORS_ORIGIN         ← API domain
AWS_ACCESS_KEY_ID   ← From AWS IAM
AWS_SECRET_ACCESS_KEY ← From AWS IAM
AWS_S3_BUCKET       ← Bucket name
AWS_REGION          ← Region
```

### Optional

```
FIREBASE_PROJECT_ID         ← For push notifications
FIREBASE_PRIVATE_KEY        ← For push notifications
FIREBASE_CLIENT_EMAIL       ← For push notifications
SMTP_HOST                   ← For email (optional)
SMTP_PORT                   ← For email (optional)
SMTP_USER                   ← For email (optional)
SMTP_PASS                   ← For email (optional)
SENTRY_DSN                  ← For error tracking (optional)
```

---

## Key Files in Repository

```
/home/user/imobi/
├── RENDER_SETUP_INDEX.md               ← YOU ARE HERE
├── RENDER_STEP_BY_STEP.md             ← START FOR SETUP
├── RENDER_QUICK_REFERENCE.md          ← Quick lookup
├── RENDER_DEPLOYMENT_SETUP.md         ← Full guide
├── RENDER_TECHNICAL_CONFIG.md         ← Technical details
├── RENDER_DEPLOYMENT_COMMANDS.sh      ← Automation scripts
├── services/api/
│   ├── prisma/
│   │   ├── schema.prisma              ← Database schema
│   │   └── migrations/                ← Migration files
│   ├── src/
│   │   └── app.module.ts              ← NestJS config
│   └── .env.example                   ← Example env vars
└── CLAUDE.md                          ← Project overview
```

---

## Support Resources

### Internal Documentation
- **CLAUDE.md** - Project overview and essential commands
- **README.md** (in root) - Repository structure

### External Documentation
- **Render Docs**: https://render.com/docs
- **Prisma Docs**: https://www.prisma.io/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/14/
- **Redis Docs**: https://redis.io/docs/
- **NestJS Docs**: https://docs.nestjs.com/

### Getting Help
1. Check **RENDER_QUICK_REFERENCE.md** → Troubleshooting
2. Search **RENDER_DEPLOYMENT_SETUP.md** for specific error
3. Review **RENDER_TECHNICAL_CONFIG.md** for configuration details
4. Run verification commands from **RENDER_DEPLOYMENT_COMMANDS.sh**
5. Check Render service logs: https://dashboard.render.com

---

## Typical Deployment Timeline

| Phase | Time | Activities |
|-------|------|------------|
| **Preparation** | 10 min | Read STEP_BY_STEP (Part 1-2) |
| **Create Database** | 5 min | Create PostgreSQL instance |
| **Create Cache** | 5 min | Create Redis instance |
| **Wait for services** | 3 min | Services become "Available" |
| **Deploy API** | 15 min | Create API Web Service on Render |
| **Configure env vars** | 5 min | Set all environment variables |
| **Wait for build** | 10-15 min | Render builds and deploys |
| **Run migrations** | 5 min | Execute db:migrate via Shell |
| **Verify setup** | 10 min | Run health checks, open Prisma Studio |
| **Configure monitoring** | 10 min | Set up alerts |
| **Deploy web frontend** | 15 min | Create Web Service for Next.js |
| **TOTAL** | **90-120 min** | Full stack deployed and tested |

---

## Completion Checklist

After following any of the guides, verify:

### Database
- [ ] PostgreSQL instance shows "Available"
- [ ] Can connect with `psql` command
- [ ] All tables created (11 total)
- [ ] Indexes created successfully

### Cache
- [ ] Redis instance shows "Available"
- [ ] Memory usage reasonable (< 50MB)
- [ ] Connected clients = 1-3

### API Service
- [ ] Service shows "Live" status
- [ ] `GET /health` returns 200
- [ ] Database connections < 10
- [ ] No connection errors in logs

### Security
- [ ] All credentials in Render dashboard only
- [ ] No secrets in git history
- [ ] Passwords > 32 characters
- [ ] SSL/TLS enabled for all connections

### Monitoring
- [ ] PostgreSQL alerts configured
- [ ] Redis alerts configured
- [ ] API health checks enabled
- [ ] Automated backups enabled

### Documentation
- [ ] Connection strings saved securely
- [ ] Disaster recovery procedures documented
- [ ] Monitoring runbook created
- [ ] Team notified of staging availability

---

## Version Information

| Component | Version | Source |
|-----------|---------|--------|
| PostgreSQL | 14.9+ | Render |
| Redis | 7.0+ | Render |
| Node.js | 18.x or 20.x | Render |
| pnpm | 8.x or 9.x | package.json |
| NestJS | ^10.0.0 | services/api/package.json |
| Prisma | ^5.0.0 | services/api/package.json |
| TypeScript | 5.x | monorepo |

---

## Document Status

- **Created**: 2026-06-02
- **Last Updated**: 2026-06-02
- **Author**: imobi Deployment Team
- **Status**: Ready for Staging Deployment
- **Tested**: Render UI as of June 2026

---

## Quick Start (TL;DR)

1. Read: **RENDER_STEP_BY_STEP.md** (20 min)
2. Create PostgreSQL on Render (5 min)
3. Create Redis on Render (5 min)
4. Deploy API to Render (15 min)
5. Run migrations from Shell (5 min)
6. Test health endpoint (2 min)
7. Done! → Full documentation available above

---

**Need help?** Start with **RENDER_STEP_BY_STEP.md** →  
**Need quick lookup?** Use **RENDER_QUICK_REFERENCE.md** →  
**Need deep dive?** Read **RENDER_DEPLOYMENT_SETUP.md**
