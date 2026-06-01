# AWS Phase 2 — Scalability & Compliance (Months 4–6)

**Timeline:** July–September 2026  
**Effort:** 48–64 hours (parallelized across 3–4 tracks)  
**Cost estimate:** $150–300/month (post-free-tier)

---

## Overview

Phase 2 scales the imobi platform beyond MVP limitations by:
1. **Migrating API** from local NestJS → AWS Lambda/ECS
2. **Migrating Web** from local Next.js → Vercel
3. **Replacing job queues** from BullMQ+Redis → AWS SQS/SNS
4. **Centralizing observability** from Sentry → CloudWatch
5. **Securing credentials** in AWS Secrets Manager

---

## Phase 2A: API Serverless Migration (Lambda/ECS)

### Current state
- NestJS + Fastify running locally or on EC2
- Manual deployment process
- Cold starts not optimized for production

### Target state
- **Option A:** Lambda + API Gateway (true serverless, pay-per-invocation)
- **Option B:** ECS Fargate (containers, predictable pricing)
- **Recommendation:** Start with ECS Fargate (easier NestJS migration), migrate to Lambda in Phase 3

### Effort
- Create Dockerfile → 1h
- Set up ECS task definition → 2h
- Configure CloudWatch alarms → 1h
- Load testing & optimization → 3h
- **Subtotal:** ~7 hours

### Cost (after free tier)
- **ECS Fargate:** $0.04664/hour (256 CPU, 512 MB RAM) = ~$34/month
- **API Gateway:** $3.50 per 1M requests + data transfer = ~$5/month
- **CloudWatch Logs:** $0.50/GB ingest = ~$10/month
- **Total:** ~$50/month

### Implementation steps
1. Create Dockerfile for NestJS (already exists partially)
2. Build & push to ECR (`AWS_STAGING_SETUP_CORRECTED.sh` handles this)
3. Create ECS cluster in us-east-2
4. Configure environment variables in ECS task definition
5. Point Route53 DNS to ALB (Application Load Balancer)
6. Monitor CloudWatch metrics

### Files to create
- `services/api/Dockerfile` (enhance if needed)
- `aws/ecs-task-definition.json` (task configuration)
- `aws/load-balancer-config.yaml` (ALB setup)
- `AWS_ECS_DEPLOYMENT.md` (deployment guide)

---

## Phase 2B: Web Frontend on Vercel

### Current state
- Next.js 14 running locally
- Deployed to Render or similar

### Target state
- Deployed to Vercel (official Next.js hosting)
- Automatic CI/CD on git push
- Edge caching, automatic scaling, SSL included

### Effort
- Connect Vercel to GitHub → 0.5h
- Set environment variables → 0.5h
- Configure preview deployments → 1h
- Monitor Vercel analytics → 1h
- **Subtotal:** ~3 hours

### Cost (after free tier)
- **Vercel Pro:** $20/month (recommended for production)
  - Includes 100GB bandwidth, automatic scaling, premium support
  - OR use free tier if usage stays below limits

### Implementation steps
1. Sign up at vercel.com
2. Import GitHub repository `contatovinicaetano93-commits/imobi`
3. Set `ROOT_DIR = apps/web`
4. Configure environment variables (API_URL, etc.)
5. Enable automatic deployments on main + preview on PRs
6. Monitor Vercel Analytics dashboard

### Files to create
- `apps/web/.vercelignore` (skip unnecessary files)
- `aws/vercel-env-template.md` (environment setup guide)

### Notes
- Vercel is the official Next.js hosting → best performance
- Free tier OK for MVP, upgrade to Pro ($20/month) for production

---

## Phase 2C: Job Queues (SQS/SNS replacement for BullMQ)

### Current state
- BullMQ jobs (parcel release, email dispatch)
- Stored in Redis
- Single-point-of-failure if Redis goes down

### Target state
- AWS SQS for parcel release queue
- AWS SNS for event broadcasting (KYC approved, etc.)
- DLQ (Dead Letter Queue) for failed jobs
- CloudWatch monitoring

### Effort
- Replace BullMQ with SQS client → 2h
- Set up SNS topics → 1h
- Create DLQ handling → 1h
- Write workers to consume from SQS → 2h
- Test with CloudWatch Logs → 1h
- **Subtotal:** ~7 hours

### Cost (after free tier)
- **SQS:** $0.40 per 1M requests = ~$0.50/month (MVP volume)
- **SNS:** $0.50 per 1M published messages = ~$0.50/month
- **Total:** ~$1/month

### Implementation steps
1. Create SQS queue: `imobi-parcel-release`
2. Create SNS topic: `imobi-events`
3. Subscribe Lambda/ECS tasks to SQS
4. Migrate job producers from `bullQueue.add()` → `sqs.sendMessage()`
5. Migrate job consumers from `bullQueue.process()` → `sqs.receiveMessage()`
6. Set up DLQ for failed messages

### Files to create
- `services/workers/sqs-consumer.ts` (queue consumer)
- `services/api/src/modules/queue/sqs.service.ts` (SQS SDK wrapper)
- `aws/sqs-setup.yaml` (CloudFormation template)
- `AWS_SQS_SETUP.md` (setup guide)

### Notes
- BullMQ and SQS can coexist during migration
- SQS is more reliable (AWS-managed vs. Redis downtime risk)

---

## Phase 2D: Centralized Observability (CloudWatch)

### Current state
- Sentry for error tracking
- Sentry for performance monitoring
- Manual log inspection

### Target state
- CloudWatch as single pane of glass
- Structured logging (JSON format)
- Alarms for errors, high latency, low disk space
- CloudWatch Dashboard for real-time metrics

### Effort
- Set up CloudWatch agent → 1h
- Create JSON logging middleware → 1.5h
- Configure alarms → 1.5h
- Build CloudWatch Dashboard → 1h
- Migrate Sentry integrations → 2h
- **Subtotal:** ~7 hours

### Cost (after free tier)
- **CloudWatch Logs:** $0.50/GB ingest = ~$10/month (100GB/month)
- **CloudWatch Alarms:** $0.10 per alarm = ~$5/month (50 alarms)
- **CloudWatch Dashboard:** Free
- **Total:** ~$15/month

### Implementation steps
1. Install `@aws-lambda-powertools/logger` (NestJS compatible)
2. Create structured logging middleware (JSON output)
3. Enable CloudWatch agent on ECS tasks
4. Create alarms:
   - Error rate > 1%
   - API latency > 500ms
   - RDS CPU > 80%
   - ElastiCache evictions > 0
5. Build CloudWatch Dashboard
6. Test end-to-end logging

### Files to create
- `services/api/src/middleware/cloudwatch-logger.ts` (logging setup)
- `aws/cloudwatch-alarms.yaml` (alarm definitions)
- `aws/cloudwatch-dashboard.json` (dashboard config)
- `AWS_CLOUDWATCH_SETUP.md` (setup guide)

### Notes
- CloudWatch Logs Insights enables SQL-like queries
- Consider X-Ray for distributed tracing (Phase 3)

---

## Phase 2E: Secrets Management (AWS Secrets Manager)

### Current state
- Credentials in `.env.local` (local file)
- Hard to rotate without downtime
- Risk of accidental commits

### Target state
- All secrets in AWS Secrets Manager
- Auto-rotation enabled
- ECS tasks fetch secrets at runtime
- No credentials in environment variables

### Effort
- Create Secrets Manager entries → 1h
- Update ECS task definition to fetch secrets → 1h
- Implement secret rotation lambda → 2h
- Test secret injection → 1h
- **Subtotal:** ~5 hours

### Cost (after free tier)
- **Secrets Manager:** $0.40 per secret per month = ~$4/month (10 secrets)
- **Rotation Lambda:** included in free tier
- **Total:** ~$4/month

### Implementation steps
1. Create secrets in AWS Secrets Manager:
   - `imobi/db/password`
   - `imobi/jwt/secret`
   - `imobi/api/keys`
   - etc.
2. Update ECS task definition to reference secrets
3. Create Lambda for automatic password rotation
4. Test rotation without downtime
5. Remove hardcoded credentials from code

### Files to create
- `aws/secrets-manager-setup.yaml` (CloudFormation)
- `aws/lambda-secret-rotation.ts` (rotation logic)
- `AWS_SECRETS_MANAGER.md` (setup guide)

### Notes
- RDS native rotation supported
- Consider automatic rotation for high-security secrets

---

## Phase 2F: Security Hardening (WAF + Shield)

### Current state
- No DDoS protection
- No SQL injection protection
- Basic HTTPS only

### Target state
- AWS WAF (Web Application Firewall)
- AWS Shield Standard (DDoS protection)
- API rate limiting
- Bot detection

### Effort
- Set up WAF rules → 2h
- Configure rate limiting → 1h
- Test attack scenarios → 1h
- **Subtotal:** ~4 hours

### Cost (after free tier)
- **WAF:** $5/month + $0.60 per 1M requests = ~$6/month
- **Shield Standard:** Free (included)
- **Shield Advanced:** $3,000/month (skip for MVP)
- **Total:** ~$6/month

### Implementation steps
1. Create WAF ACL (Access Control List)
2. Add rules:
   - SQL injection protection
   - XSS protection
   - Rate limiting (1000 req/5min per IP)
   - Bot control
3. Associate with API Gateway or ALB
4. Monitor WAF metrics in CloudWatch
5. Test with OWASP tools

### Files to create
- `aws/waf-rules.yaml` (WAF ACL)
- `AWS_WAF_SETUP.md` (setup guide)

---

## Phase 2 Timeline & Dependencies

```
Week 1-2 (Parallel)
├─ Phase 2A: API ECS migration
├─ Phase 2B: Vercel deployment
└─ Phase 2C: SQS/SNS setup

Week 3-4 (Sequential)
├─ Phase 2D: CloudWatch observability
├─ Phase 2E: Secrets Manager
└─ Phase 2F: WAF + Shield

Week 5-6: Integration & Testing
├─ End-to-end testing
├─ Load testing
├─ Failover testing
└─ Security audit
```

---

## Rollback Strategy

Each component has a rollback plan:
- **ECS → NestJS local:** Keep local API running, switch ALB target
- **Vercel → Render:** Keep Render deployment active, update DNS
- **SQS → BullMQ:** Maintain BullMQ during migration, switch consumers
- **CloudWatch → Sentry:** Sentry still receives logs, can re-enable

---

## Success Criteria

| Milestone | Criteria | Owner |
|-----------|----------|-------|
| API on ECS | 99.9% uptime, <200ms latency | Backend |
| Web on Vercel | <2s first paint, all tests passing | Frontend |
| SQS queues | Zero lost jobs, <30s processing | Infrastructure |
| CloudWatch | Real-time visibility, 5 alarms active | Operations |
| Secrets Manager | 100% auto-rotation, zero secrets in code | Security |
| WAF | Block 99%+ malicious requests | Security |

---

## Phase 2 Cost Summary

| Component | Monthly cost |
|-----------|--------------|
| ECS Fargate | $34 |
| API Gateway | $5 |
| CloudWatch | $10 |
| SQS/SNS | $1 |
| Secrets Manager | $4 |
| WAF | $6 |
| Vercel Pro | $20 |
| RDS (Phase 1 carryover) | $20 |
| ElastiCache (Phase 1 carryover) | $15 |
| **TOTAL** | **~$115/month** |

---

## Next: Phase 3 Roadmap (Months 7+)

See `AWS_PHASE_3_ROADMAP.md` for:
- Lambda migration (true serverless)
- Cognito for authentication
- API caching with CloudFront
- Multi-region disaster recovery
- Cost optimization (Savings Plans, Reserved Instances)

---

## Quick Links

- Phase 1 Completion: `AWS_PHASE_1_COMPLETION.md`
- Phase 3 Roadmap: `AWS_PHASE_3_ROADMAP.md` (TBD)
- AWS Console: https://047556738507.signin.aws.amazon.com/console
- Vercel Dashboard: https://vercel.com/dashboard
- CloudWatch: https://console.aws.amazon.com/cloudwatch

---

**Next review date:** July 1, 2026  
**Target completion:** September 30, 2026  
**Status:** 🟢 Ready to begin
