# 🚀 AWS Deployment Plan — imobi

**Status**: Phase 4-C Ready → AWS Migration
**Region**: `sa-east-1` (São Paulo, Brazil)
**Mode**: AWS Free Tier (validate before paying)
**Go-Live**: 2026-06-02 02:00 UTC

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTS                             │
│          (Web: imobi.vercel.app → imobi.com.br)        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    CloudFront (CDN)         Route53 (DNS)
        │                         │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────────────────┐
        │  AppRunner/ECS (Next.js Frontend)   │
        │  Port: 3000                         │
        └────────────┬───────────────────────┘
                     │
        ┌────────────▼────────────────────────┐
        │  EC2/ECS (NestJS API)               │
        │  Port: 3001                         │
        │  VPC Security Group                 │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    RDS PostgreSQL          ElastiCache Redis
    + PostGIS              (Sessions, Cache)
        │
    S3 + Backup
    (Fotos obras)
```

---

## 🆓 AWS Free Tier Limits (12 months)

| Service | Free Tier | imobi Need | Status |
|---------|-----------|-----------|--------|
| **RDS PostgreSQL** | 750 hrs/mo, 20GB storage | ✅ Fits | ✅ Free |
| **ElastiCache Redis** | 750 hrs/mo, t3.micro | ✅ Fits | ✅ Free |
| **EC2** | 750 hrs/mo, t3.micro | ✅ Need 2x | ⚠️ Partial |
| **AppRunner** | Not in free tier | ✅ Need | 💰 Paid |
| **S3** | 5GB storage | ✅ Fits initially | ✅ Free |
| **Data Transfer** | 100GB/mo OUT | ✅ Fits | ✅ Free |
| **CloudFront** | 50GB/mo | ✅ Fits | ✅ Free |

**Free Tier Cost**: ~$0 for 12 months (if EC2 only, not AppRunner)
**After Free Tier**: ~$150-250/month for production

---

## 📋 Deployment Strategy

### Phase 1: Prep (TODAY)
- [ ] Terraform setup with AWS CLI
- [ ] VPC + Security Groups
- [ ] RDS PostgreSQL + PostGIS
- [ ] ElastiCache Redis

### Phase 2: App Servers (DAY 2)
- [ ] EC2 for NestJS API deployment
- [ ] Next.js app on EC2 or AppRunner
- [ ] Environment variables → Secrets Manager

### Phase 3: Networking (DAY 3)
- [ ] Route53 DNS (temporary, use localhost first)
- [ ] Security Groups (ports 3000, 3001, 5432, 6379)
- [ ] SSL certificates (ACM)

### Phase 4: CI/CD (DAY 4)
- [ ] GitHub → CodePipeline trigger
- [ ] CodeBuild for tests + deploy
- [ ] Auto-deployment on git push

### Phase 5: Monitoring (DAY 5)
- [ ] CloudWatch Logs
- [ ] CloudWatch Alarms
- [ ] Error notifications to Slack/SNS

---

## 🔧 Quick Start (Next Steps)

```bash
# 1. Configure AWS CLI
export AWS_REGION=sa-east-1
aws configure

# 2. Create infrastructure
cd /home/user/imobi/terraform
terraform init
terraform plan
terraform apply

# 3. Deploy apps
./scripts/deploy-api.sh
./scripts/deploy-web.sh

# 4. Verify
aws elbv2 describe-load-balancers
aws rds describe-db-instances
```

---

## 💾 Free Tier Strategy

**Recommended (Max Free):**
- RDS: `db.t3.micro` PostgreSQL 12.15 (750 hrs ≈ 31 days continuous)
- Redis: `cache.t3.micro` (750 hrs free)
- EC2: `t3.micro` x2 for API + Web (750 hrs free covers 1 instance)
- S3: 5GB free storage
- Data: 100GB/mo OUT free

**Once validating works:**
- Upgrade to `t3.small` or higher as needed
- Use AppRunner for auto-scaling (~$7/month per app)
- CloudFront for CDN caching

---

## 🚨 Known Costs After Free Tier

| Component | Free | After 12mo |
|-----------|------|------------|
| RDS t3.micro | Included | ~$35/mo |
| ElastiCache t3.micro | Included | ~$20/mo |
| EC2 t3.micro | 750h/mo | ~$10/mo (overage) |
| AppRunner (optional) | ✗ | ~$7/mo per app |
| S3 | 5GB | ~$1/mo (typical) |
| Data OUT | 100GB/mo | ~$0.09/GB after |
| **Total** | **$0** | **~$80-150/mo** |

---

## 📝 Files to Create

1. ✅ `terraform/main.tf` — VPC, RDS, ElastiCache, EC2
2. ✅ `terraform/variables.tf` — Configuration
3. ✅ `terraform/outputs.tf` — Endpoints
4. ✅ `scripts/deploy-api.sh` — NestJS deployment
5. ✅ `scripts/deploy-web.sh` — Next.js deployment
6. ✅ `.env.aws` — AWS environment template
7. ✅ `docs/AWS-SETUP.md` — Detailed guide

---

## ✅ Success Criteria

- [ ] RDS PostgreSQL accessible from local machine
- [ ] ElastiCache Redis accessible
- [ ] EC2 instance running and SSH-able
- [ ] NestJS API deployed and responding
- [ ] Next.js frontend deployed and accessible
- [ ] Database migrations applied
- [ ] S3 bucket for photos working
- [ ] CI/CD pipeline automatic
- [ ] Logs visible in CloudWatch

---

## 🎯 GO-LIVE Readiness

After AWS setup complete:
- ✅ Database: RDS PostgreSQL + PostGIS
- ✅ Cache: ElastiCache Redis
- ✅ API: NestJS on EC2
- ✅ Web: Next.js on AppRunner/EC2
- ✅ Storage: S3 for images
- ✅ DNS: Route53 (when buying domain)
- ✅ CDN: CloudFront
- ✅ CI/CD: CodePipeline
- ✅ Monitoring: CloudWatch
- ✅ Backup: RDS automated backups

---

## 📞 Support

Issues? Check:
- AWS CloudWatch Logs
- EC2 security groups
- RDS inbound rules (5432 from EC2 SG)
- ElastiCache inbound rules (6379 from EC2 SG)

https://claude.ai/code/session_01LU8P1oUR6FiKj8Ttcziv8R
