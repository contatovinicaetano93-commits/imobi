# AWS PHASE 1 Implementation Plan
**Target**: Months 1-3 | **Status**: 🔴 NOT STARTED  
**Responsible**: Team  
**Free Tier Deadline**: 12 months from account creation

---

## SUMMARY
Migrar 3 ferramentas críticas do ambiente local para AWS free tier, mantendo aplicação funcionando.

| Ferramenta | Local → AWS | Custo | Effort | Status |
|-----------|-----------|-------|--------|--------|
| Email | Nodemailer → SES | FREE (50k/dia) | 2h | 📝 TODO |
| Database | PostgreSQL local → RDS | FREE (750h/mês) | 4h | 📝 TODO |
| Cache | Redis local → ElastiCache | FREE (cache.t2.micro) | 3h | 📝 TODO |
| **TOTAL** | | **FREE** | **~9h** | 📝 TODO |

---

## TASK 1: Email (Nodemailer → AWS SES) — 2h
**File**: `services/api/src/modules/email/`  
**Free Tier**: 50,000 emails/day (forever)

### Steps
```bash
# 1. Criar conta SES na AWS
# 2. Verificar email de sender (SES Dashboard)
# 3. Instalar AWS SDK
npm install @aws-sdk/client-ses

# 4. Implementar SES adapter
# Substituir: services/api/src/modules/email/email.service.ts
# 5. Testar: npm run test -- email.spec.ts
# 6. Update .env
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@imbobi.com

# 7. Deploy local e testar
```

### Code Change
```typescript
// Antes (Nodemailer)
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({ ... });
await transporter.sendMail({ ... });

// Depois (SES)
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
const ses = new SESClient({ region: 'us-east-1' });
await ses.send(new SendEmailCommand({ ... }));
```

### Validation
- ✅ KYC approval email enviado com sucesso
- ✅ KYC rejection email enviado com sucesso
- ✅ Verificar SES Dashboard: 1+ emails enviados

---

## TASK 2: Database (PostgreSQL Local → AWS RDS) — 4h
**Free Tier**: 750 hours/month (t2.micro, 20GB storage)

### Steps
```bash
# 1. Criar instância RDS PostgreSQL no AWS Console
#    - Engine: PostgreSQL 16
#    - Instance class: db.t2.micro
#    - Storage: 20 GB gp2
#    - Backup: 7 days (default)
#    - Publicly accessible: NO (use security group)

# 2. Get RDS endpoint: imbobi-db.xxxxx.us-east-1.rds.amazonaws.com

# 3. Update .env
DATABASE_URL=postgresql://imbobi:PASSWORD@imbobi-db.xxxxx.us-east-1.rds.amazonaws.com:5432/imbobi

# 4. Run migrations
pnpm db:migrate

# 5. Verify connection
PGPASSWORD=PASSWORD psql -h imbobi-db.xxxxx.us-east-1.rds.amazonaws.com -U imbobi -d imbobi -c "SELECT version();"

# 6. Update local .env to point to RDS
# 7. Run tests
npm run test

# 8. Backup old database
pg_dump postgresql://imbobi:password@localhost:5432/imbobi_test > imbobi_backup_local.sql
```

### Security Group Setup
```
Inbound:
- PostgreSQL (5432) from IP range containing app servers
- Optional: Your office IP for debugging

Outbound:
- Allow all (default)
```

### Validation
- ✅ All tests pass with RDS connection
- ✅ Can query tables: `SELECT COUNT(*) FROM "Usuario";`
- ✅ Prisma migrations applied successfully
- ✅ KYC documents persisted and retrieved

---

## TASK 3: Cache/Sessions (Redis Local → AWS ElastiCache) — 3h
**Free Tier**: cache.t2.micro (0.5 GB)

### Steps
```bash
# 1. Criar ElastiCache Redis cluster no AWS Console
#    - Engine: Redis 7.0
#    - Node type: cache.t2.micro
#    - Number of nodes: 1
#    - Automatic failover: disabled (free tier)
#    - Encryption at rest: enabled

# 2. Get endpoint: imbobi-cache.xxxxx.ng.0001.use1.cache.amazonaws.com:6379

# 3. Update .env
REDIS_URL=redis://imbobi-cache.xxxxx.ng.0001.use1.cache.amazonaws.com:6379

# 4. Stop local Redis
systemctl stop redis-server

# 5. Test connection
redis-cli -h imbobi-cache.xxxxx.ng.0001.use1.cache.amazonaws.com -p 6379 ping

# 6. Restart API
npm run dev

# 7. Verify BullMQ works with ElastiCache
# Trigger a liberacao-parcela job and verify it's processed
```

### Security Group Setup
```
Inbound:
- Redis (6379) from security group of API servers
Outbound:
- Allow all (default)
```

### Validation
- ✅ `redis-cli ping` returns PONG
- ✅ BullMQ connects successfully
- ✅ Cache operations work (set/get)
- ✅ Session data persists across requests

---

## TESTING CHECKLIST (After All 3 Tasks)
- [ ] Run full test suite: `npm run test`
- [ ] Manual testing: Register → Create obra → Upload KYC → Check email
- [ ] Performance check: Response times < 500ms (local should be ~same)
- [ ] Verify AWS costs: Should be $0 with free tier
- [ ] Backup: Export database from RDS
- [ ] Documentation: Update README with AWS setup

---

## ROLLBACK PLAN
If issues occur:
```bash
# 1. Revert .env to local services
DATABASE_URL=postgresql://imbobi:password@localhost:5432/imbobi
REDIS_URL=redis://localhost:6379

# 2. Restore local database
psql postgresql://imbobi:password@localhost:5432/imbobi < imbobi_backup_local.sql

# 3. Restart local Redis
systemctl start redis-server

# 4. Run migrations again (should be idempotent)
pnpm db:migrate
```

---

## AWS COST ESTIMATE (Year 1)
| Service | Free Tier Limit | Monthly Cost |
|---------|-----------------|--------------|
| RDS PostgreSQL | 750h/month, 20GB | $0 |
| ElastiCache Redis | cache.t2.micro | $0 |
| SES | 50k emails/day | $0 |
| **TOTAL** | | **$0** |

*After free tier (Month 13+)*: ~$40-50/month depending on usage

---

## NEXT STEPS (PHASE 2 - Months 4-6)
- [ ] Migrate NestJS to Lambda (detailed plan: AWS_PHASE2_IMPLEMENTATION.md)
- [ ] Migrate Next.js to Vercel
- [ ] Replace BullMQ with SQS/SNS
- [ ] Consolidate CloudWatch
- [ ] Cost optimization review

---

**Created**: 2026-05-31  
**Last Updated**: 2026-05-31  
**Implementation Start Date**: TBD  
**Expected Completion**: TBD
