# Phase 1 AWS Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       imbobi Application Layer                   │
│                    (Next.js Web + Expo Mobile)                   │
└────────────────┬──────────────────────────────────────────────┘
                 │ HTTP/HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS API Server (Phase 1)                   │
│                   (services/api - Port 4000)                     │
│  ┌─────────────┬────────────────┬──────────────┐               │
│  │ Auth        │ Email Service  │ Job Queue    │               │
│  │ (JWT)       │ (USE_AWS_SES)  │ (BullMQ)     │               │
│  └─────────────┴────────────────┴──────────────┘               │
└────┬──────────────────────────────────┬────────────────┬────────┘
     │                                  │                │
     ▼                                  ▼                ▼
┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
│  RDS PostgreSQL  │  │ ElastiCache Redis    │  │ AWS SES          │
│  (Phase 1)       │  │ (Phase 1)            │  │ (Phase 1)        │
│  ┌──────────────┐│  │ ┌──────────────┐    │  │ ┌──────────────┐ │
│  │ t2.micro     ││  │ │ cache.t2.    │    │  │ │ Email        │ │
│  │ 20GB storage ││  │ │ micro        │    │  │ │ Service      │ │
│  │ Single AZ    ││  │ │ Single node  │    │  │ │ 50k/day free │ │
│  │ 7d backup    ││  │ │ Encryption   │    │  │ │ noreply@     │ │
│  └──────────────┘│  │ │ @rest       │    │  │ │ imbobi.      │ │
│  VPC: 10.0.0.0/16 │  │ └──────────────┘    │  │ │ com.br      │ │
└────────┬──────────┘  └────────┬─────────────┘  └──────┬────────┘
         │                      │                       │
         │                      │                    Sends to:
         │                      │                    Customers,
         │                      │                    Internal
         │                      │
         │  Connection Pool     │  Job Queue
         │                      │
         └──────────────────┬───┴──────────────┘
                            │
                    ┌───────▼────────┐
                    │  Private       │
                    │  Subnets       │
                    │  (2 AZs)       │
                    │  VPC:          │
                    │  10.0.0.0/16   │
                    └────────────────┘
```

## Network Topology

```
AWS VPC (10.0.0.0/16)
│
├─ Private Subnet 1 (10.0.1.0/24) - AZ: us-east-1a
│  ├─ RDS PostgreSQL (imbobi-postgres)
│  └─ ElastiCache Redis (imbobi-redis)
│
├─ Private Subnet 2 (10.0.2.0/24) - AZ: us-east-1b
│  ├─ RDS Replica standby (future Phase 2)
│  └─ Reserved for ECS/Lambda (Phase 2)
│
└─ Security Groups
   ├─ imbobi-rds-sg: Port 5432 from ECS/Lambda
   ├─ imbobi-elasticache-sg: Port 6379 from ECS/Lambda
   └─ imbobi-ecs-sg: For future ECS tasks/Lambda functions
```

## Data Flow Diagrams

### Email Sending Flow
```
Application Code (services/api/src/modules/email/)
            │
            ▼
    EmailService.enviarEmail()
            │
    ┌───────┴───────┐
    │               │
    ▼ (if USE_AWS_SES=true)
AWS SES Client      ▼ (fallback)
    │            Nodemailer
    │            (SMTP)
    │               │
    ▼               ▼
AWS SES API     SMTP Relay
    │               │
    ▼               ▼
   Email ─────────▶ Recipient
         ~5-10s
```

### Database Query Flow
```
Application (Prisma Client)
            │
            ▼
Prisma ORM Layer
            │
            ▼
PostgreSQL Driver
            │
            ▼
Network (TCP/IP on 5432)
            │
            ▼
RDS Security Group
            │
            ▼
RDS PostgreSQL Instance
    (imbobi_dev database)
            │
            ▼
    Response ◀─────┘
```

### Job Queue Flow
```
BullMQ Job Producer
       │
       ▼
Create Job:
- Type: "liberacao-parcela"
- Data: {parcela_id, valor}
       │
       ▼
Connect to Redis
(REDIS_HOST:6379)
       │
       ▼
ElastiCache Redis
- Store job in queue
- TTL: 24 hours
       │
       ▼
BullMQ Job Consumer
(liberacao-parcela.worker.ts)
       │
       ▼
Process Job:
- Update database
- Send notifications
- Mark complete
```

## Free Tier Service Details

### 1. RDS PostgreSQL

**Specifications**:
- Engine: PostgreSQL 15.4
- Instance Class: db.t2.micro
- Storage: 20 GB (gp2)
- Multi-AZ: No (single AZ)
- Backup: 7 days
- Encryption: AES-256 (at-rest) + SSL (in-transit)

**Free Tier Limit**:
- 750 hours/month = ~31 days continuous runtime
- 20 GB storage included
- Backup storage (first 100 GB free)

**Cost After Free Tier**:
- $0.017/hour for t2.micro
- ~$12/month if continuously running
- Upgradeable to t3.small ($0.025/hour) within free tier

```sql
-- Connection String Example
postgresql://imbobimaster:PASSWORD@imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com:5432/imbobi_dev

-- SSL (recommended)
postgresql://imbobimaster:PASSWORD@imbobi-postgres.xxxxx.us-east-1.rds.amazonaws.com:5432/imbobi_dev?sslmode=require
```

### 2. ElastiCache Redis

**Specifications**:
- Node Type: cache.t2.micro
- Engine: Redis 7.0
- Nodes: 1 (no replication)
- Port: 6379
- Encryption at Rest: Yes
- Encryption in Transit: No (free tier limitation)

**Free Tier Limit**:
- 750 hours/month = ~31 days continuous runtime
- Single node only (no HA)
- No automatic backups

**Cost After Free Tier**:
- $0.017/hour for cache.t2.micro
- ~$12/month if continuously running
- Upgradeable to cache.t3.micro later

```bash
# Connection Examples
redis-cli -h imbobi-redis.xxxxx.cache.amazonaws.com -p 6379
# or
REDIS_URL=redis://imbobi-redis.xxxxx.cache.amazonaws.com:6379
```

### 3. SES (Email Service)

**Specifications**:
- Service Tier: Sandbox (development)
- Daily Sending Limit: 50,000 emails/day
- Sending Rate: 1 email/second
- Verified Identities: `noreply@imbobi.com.br`
- Region: us-east-1

**Free Tier Limit**:
- 50,000 emails/day (free forever)
- Always free—no time limitation
- No charges for receiving emails to verified address

**Cost After Free Tier**:
- $0.10 per 1,000 emails sent
- Only charged for emails sent to external recipients
- No charge for bounces/complaints (helpful monitoring)

```javascript
// Environment Configuration
USE_AWS_SES=true
SES_FROM_EMAIL="noreply@imbobi.com.br"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│          AWS Account (Root/IAM)                      │
│  ┌─────────────────────────────────────────────────┐│
│  │        VPC: imbobi-vpc (10.0.0.0/16)           ││
│  │  ┌───────────────────────────────────────────┐ ││
│  │  │ Private Subnets (no internet access)      │ ││
│  │  │  ┌─────────┐      ┌──────────────┐       │ ││
│  │  │  │   RDS   │      │ ElastiCache  │       │ ││
│  │  │  │ SG:5432 │      │ SG: 6379     │       │ ││
│  │  │  └─────────┘      └──────────────┘       │ ││
│  │  │                                           │ ││
│  │  │  Ingress: Only from ECS/Lambda SG        │ ││
│  │  │  Egress: Full egress allowed             │ ││
│  │  └───────────────────────────────────────────┘ ││
│  │                                                  ││
│  │  ┌───────────────────────────────────────────┐ ││
│  │  │ Route Table (Private)                     │ ││
│  │  │  - NAT Gateway (future Phase 2)           │ ││
│  │  │  - No Internet Gateway                    │ ││
│  │  └───────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Services:                                           │
│  ┌─────────────────────────────────────────────────┐│
│  │  SES: Accessible via IAM role credentials      ││
│  │  CloudWatch: Accessible via IAM role           ││
│  │  SNS: Accessible for alerts                    ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Security Measures**:
- ✅ Private subnets for database & cache (no public IP)
- ✅ Security groups with least-privilege rules
- ✅ Encryption at-rest for RDS & ElastiCache
- ✅ SSL/TLS encryption in-transit for RDS
- ✅ RDS deletion protection enabled
- ✅ CloudWatch logging enabled
- ✅ IAM-based access (no hardcoded credentials in code)

## Monitoring & Alerts

```
┌──────────────────────────────────────┐
│     CloudWatch (Central Monitoring)  │
├──────────────────────────────────────┤
│ Logs                                 │
│ ├─ RDS PostgreSQL queries            │
│ ├─ Application logs (/aws/imbobi)    │
│ └─ ElastiCache events                │
│                                      │
│ Metrics                              │
│ ├─ RDS CPU, Connections, Queries    │
│ ├─ ElastiCache CPU, Evictions       │
│ ├─ SES Send/Bounce/Complaint rates  │
│ └─ Network throughput                │
│                                      │
│ Alarms                               │
│ ├─ SES bounce rate > 100 bounces/5m │
│ └─ (Custom alarms in Phase 2)       │
│                                      │
│ SNS Topics                           │
│ ├─ imbobi-elasticache-notifications │
│ ├─ imbobi-ses-alerts                │
│ └─ Email subscriptions (optional)    │
└──────────────────────────────────────┘
```

## Scalability Roadmap

### Phase 1 (Current)
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   RDS       │     │ ElastiCache  │     │     SES     │
│ t2.micro    │────→│ t2.micro     │────→│ 50k/day     │
│ 1 AZ        │     │ 1 node       │     │             │
│ 20GB        │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
     ↓                    ↓                     ↓
   Free Tier         Free Tier            Free Tier
```

### Phase 2 (Months 4-6)
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   RDS       │     │ ElastiCache  │     │     SES     │
│ t3.small    │────→│ t3.small +   │────→│ 100k/day    │
│ Multi-AZ    │     │ Replicas     │     │ Request     │
│ 100GB       │     │ Cluster      │     │ Quota       │
└─────────────┘     └──────────────┘     └─────────────┘
     ↓                    ↓                     ↓
 ~$30-50/mo          ~$30-50/mo          ~$20-30/mo
```

### Phase 3 (Months 7+)
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Aurora    │     │ ElastiCache  │     │     SES     │
│ Serverless  │────→│ Cluster +    │────→│ Custom      │
│ Auto-scale  │     │ Sharding     │     │ Domain      │
│ Read replicas│    │              │     │ Reputation  │
└─────────────┘     └──────────────┘     └─────────────┘
     ↓                    ↓                     ↓
  ~$50-150/mo         ~$100-200/mo         ~$50-100/mo
```

## Deployment Pipeline

```
Code → Git → Terraform → AWS Console
 │
 ├─ terraform init    (download providers)
 ├─ terraform validate (syntax check)
 ├─ terraform plan    (preview changes)
 ├─ terraform apply   (create resources)
 │
 └─ Outputs:
    ├─ RDS endpoint
    ├─ Redis endpoint
    ├─ SES from email
    └─ CloudWatch log group
```

## Timeline Estimate

| Phase | Duration | Key Milestones |
|-------|----------|-----------------|
| **Phase 1 (MVP)** | 1-3 months | ✅ RDS, ElastiCache, SES deployed |
| **Phase 2 (Scalability)** | 3-6 months | Lambda, Vercel, SQS/SNS, CloudWatch |
| **Phase 3 (Security)** | 6+ months | Cognito, Secrets Manager, WAF, Shield |

## Cost Summary

| Phase | Services | Monthly Cost |
|-------|----------|-------------:|
| **Phase 1** | RDS, ElastiCache, SES | $0 (free tier) |
| **Phase 1+** (after 12mo) | RDS, ElastiCache, SES | ~$30-100 |
| **Phase 2** | + Lambda, API Gateway, SQS/SNS | ~$100-300 |
| **Phase 3** | + Cognito, Secrets Mgr, WAF, Shield | ~$200-500 |

---

**Architecture Version**: 1.0  
**Status**: ✅ Phase 1 Design Finalized  
**Last Updated**: 2026-06-02
