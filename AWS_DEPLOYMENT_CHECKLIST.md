# AWS Deployment Checklist — imobi GO-LIVE

**Deadline**: 2026-06-02 02:00 UTC  
**Current Status**: Infrastructure deployment in progress (RDS waiting for availability)

---

## Phase 1: Infrastructure Deployment ⏳ (In Progress)

- [x] VPC created (vpc-0a48b172302c37eab) with CIDR 10.0.0.0/16
- [x] Internet Gateway created (igw-0fae0bc97dc3fa4ae)
- [x] Public Subnet in sa-east-1a (subnet-03626c728e2496aac)
- [x] Private Subnet in sa-east-1b (subnet-033a18445d52a86d5) — Multi-AZ support
- [x] Route table configured with IGW
- [x] EC2 Security Group (sg-0d5817b33a882ca19) — ports 22, 3000, 3001
- [x] RDS Security Group (sg-0faee2709f5e4a41f) — port 5432
- [x] Redis Security Group (sg-0b54a7de6490b7f2d) — port 6379
- [x] RDS subnet group created (imobi-db-subnet)
- [ ] RDS PostgreSQL instance (imobi-postgres) — **Waiting for availability** (attempt 2/60)
- [ ] ElastiCache Redis cluster — Pending RDS
- [ ] EC2 API instance (t3.micro) — Pending RDS
- [ ] EC2 Web instance (t3.micro) — Pending RDS
- [ ] S3 bucket (imobi-obra-photos-*) — Pending RDS
- [ ] Key pairs generated — Pending RDS

**Current Wait**: ~8-10 minutes remaining for RDS to become available

---

## Phase 2: Post-Deployment Configuration ⏳ (Ready to Execute)

Once /tmp/imobi-aws-config.txt is generated:

### 2.1 Extract Infrastructure Credentials
```bash
# Parse from /tmp/imobi-aws-config.txt:
- RDS_ENDPOINT (hostname:5432)
- RDS_PASSWORD (auto-generated)
- REDIS_ENDPOINT (hostname:6379)
- API_INSTANCE_IP (public IP for API EC2)
- WEB_INSTANCE_IP (public IP for Web EC2)
- S3_BUCKET_NAME (imobi-obra-photos-ACCOUNT_ID)
- SSH_KEY_PATH (~/.ssh/imobi-key.pem)
```

### 2.2 Create Environment Files
```bash
# .env.production (root)
DATABASE_URL="postgresql://postgres:PASSWORD@RDS_ENDPOINT/imobi_prod?schema=public"
REDIS_URL="redis://REDIS_ENDPOINT:6379"
CORS_ORIGIN="https://web.app.example.com"
NODE_ENV="production"
```

```bash
# services/api/.env.production
DATABASE_URL="postgresql://postgres:PASSWORD@RDS_ENDPOINT/imobi_prod?schema=public"
REDIS_URL="redis://REDIS_ENDPOINT:6379"
JWT_SECRET="$(openssl rand -base64 32)"
AWS_S3_BUCKET="S3_BUCKET_NAME"
AWS_S3_REGION="sa-east-1"
NODE_ENV="production"
```

```bash
# apps/web/.env.production
NEXT_PUBLIC_API_URL="http://API_INSTANCE_IP:3001"
```

### 2.3 Deploy NestJS API
```bash
./scripts/deploy-api.sh API_INSTANCE_IP production
# Deploys to /opt/imobi on API instance
# Runs: pnpm install, pnpm build, pm2 start
```

### 2.4 Deploy Next.js Web
```bash
./scripts/deploy-web.sh WEB_INSTANCE_IP API_URL production
# Deploys to /opt/imobi on Web instance
# Runs: pnpm install, pnpm build, pm2 start
```

### 2.5 Initialize RDS Database
```bash
# Connect to RDS
PGPASSWORD="RDS_PASSWORD" psql -h RDS_ENDPOINT -U postgres -d imobi_prod << EOF
  -- Create schema with PostGIS extension
  CREATE EXTENSION IF NOT EXISTS postgis;
  -- Run migrations
EOF

# Run Prisma migrations from local
pnpm db:migrate -- --name initial
```

### 2.6 Verify All Services
```bash
# API health check
curl http://API_INSTANCE_IP:3001/health

# Web accessibility  
curl -I http://WEB_INSTANCE_IP:3000

# RDS connectivity
psql -h RDS_ENDPOINT -U postgres -d imobi_prod -c "SELECT version();"

# Redis connectivity
redis-cli -h REDIS_ENDPOINT PING
```

---

## Phase 3: Testing & Validation ⏳ (After Phase 2)

### 3.1 Critical User Flows
- [ ] User signup/login works
- [ ] Dashboard loads with real data
- [ ] Photo upload to S3 works
- [ ] GPS validation with PostGIS
- [ ] Payment flow (BullMQ jobs)

### 3.2 Performance Checks
- [ ] API response time < 500ms
- [ ] Web page load < 2s
- [ ] Rate limiting operational

### 3.3 Monitoring Setup
- [ ] CloudWatch logs streaming
- [ ] Alarms configured (RDS CPU, disk, connections)
- [ ] Sentry error tracking active

---

## Phase 4: DNS & Domain Configuration ⏳ (Before GO-LIVE)

- [ ] Point domain to Web instance IP
- [ ] Point API subdomain to API instance IP
- [ ] SSL/TLS certificates (AWS Certificate Manager or Let's Encrypt)
- [ ] Update CORS origins in API

---

## Phase 5: Final GO-LIVE Validation ⏳ (Day of)

**Deadline**: 2026-06-02 02:00 UTC

- [ ] All environments deployed and verified
- [ ] Database migrations complete
- [ ] Backups configured and tested
- [ ] Monitoring and alerts active
- [ ] Team standup: Ready to flip the switch
- [ ] Switch DNS to production
- [ ] Monitor for errors in first hour

---

## Cost Estimate (Free Tier, First 12 Months)

| Resource | Free Tier | Est. Monthly |
|----------|-----------|--------------|
| RDS PostgreSQL (t3.micro) | 750 hrs | $0 |
| ElastiCache Redis (cache.t3.micro) | 750 hrs | $0 |
| EC2 t3.micro (1 instance) | 750 hrs | $0 |
| EC2 t3.micro (2nd instance) | Overage | ~$10 |
| S3 Storage (5GB free) | 5GB | $0 |
| Data Transfer (100GB/month free) | 100GB | $0 |
| **TOTAL** | | **~$10/month** |

After 12 months: ~$80-120/month depending on usage

---

## Rollback Plan (If Needed)

If issues occur before GO-LIVE:
1. Point DNS back to Vercel or previous environment
2. Keep AWS infrastructure running (for troubleshooting)
3. Investigate logs in CloudWatch
4. Fix issues and re-test before retry

To destroy infrastructure (if needed):
```bash
aws cloudformation delete-stack --stack-name imobi-infrastructure
# Or manually delete resources from AWS Console
```

---

**Last Updated**: 2026-05-31 19:00 UTC  
**Next Action**: Monitor RDS availability until /tmp/imobi-aws-config.txt is generated
