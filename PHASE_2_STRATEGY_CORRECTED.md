# Phase 2 — Escalabilidade Inteligente (Meses 6-12)

## 🔴 Problemas Identificados na Estratégia Original

A Phase 2 original tinha **3 anti-patterns críticos**:

| Anti-pattern | Problema | Custo | Solução |
|--------------|----------|-------|---------|
| **Lambda para NestJS** | Servidor contínuo em Lambda (cold starts, limite 15 min) | $200+/mês | **ECS Fargate** (~$60/mês) |
| **SQS para BullMQ** | 5-10x latência, overkill para MVP, FIFO bottleneck | $1/mês false economy | **Keep BullMQ + ElastiCache** (~$20/mês) |
| **SES sem contexto** | Sem entender o custo real vs benefício | Análise incompleta | **Analisar ROI por componente** |

---

## ✅ Phase 2 Corrigida — Estratégia Inteligente

### **Pilar 1: API Server (NestJS) → ECS Fargate + ALB**

**Por que ECS Fargate (não Lambda)?**
- ✅ Servidor contínuo (NestJS foi feito para isso)
- ✅ Sem cold starts (problema resolvido)
- ✅ BullMQ funciona nativamente (Redis mantém estado)
- ✅ Jobs podem rodar > 15 minutos (liberacao-parcela.worker.ts precisa)
- ✅ Custo: $60/mês vs $200+/mês com Lambda

**Implementação:**
```
1. Docker: Usar Dockerfile existente (aprimorar)
2. ECR: Push imagem para AWS container registry
3. ECS: Criar task definition com 2 replicas (HA)
4. ALB: Application Load Balancer com health checks
5. CloudWatch: Métricas de CPU, memória, requisições
6. Route53: DNS apontando para ALB
```

**Custo:**
- ECS Fargate 256CPU, 512MB: $0.04664/hora = **$34/mês**
- ALB: **$16/mês** (fixed + data transfer)
- CloudWatch Logs: **$10/mês** (100GB ingestion)
- **Total: ~$60/mês**

---

### **Pilar 2: Frontend (Next.js) → Vercel**

**Por que Vercel?**
- ✅ Next.js oficial (feito pelo mesmo time)
- ✅ Edge caching + CDN (80% redução de latência)
- ✅ CI/CD automático (git push = deploy)
- ✅ Preview deployments (cada PR)
- ✅ Analytics built-in

**Implementação:**
```
1. GitHub: Conectar repo ao Vercel
2. ROOT_DIR: `apps/web`
3. Env vars: API_URL, etc.
4. Preview: Automático em cada PR
5. Production: Automático em merge para main
```

**Custo:**
- Vercel Pro: **$20/mês** (100GB bandwidth, priority support)
- Ou free tier se < 100GB bandwidth/mês

---

### **Pilar 3: Cache & Queues → ElastiCache + BullMQ (Mantém)**

**Por que NÃO migrar para SQS em Phase 2?**

| Métrica | BullMQ+Redis | SQS/SNS |
|---------|------------|---------|
| **Latência** | <10ms | ~100ms |
| **Ordering** | Garantido | FIFO only (lento) |
| **Max throughput** | 10k+ jobs/sec | 300/sec (FIFO) |
| **Custo** | $15/mês (ElastiCache) | $1/mês (false economy) |
| **Adequado para** | MVP → 100k jobs/dia | Enterprise scale |

**Implementação Phase 2:**
```
1. Keep BullMQ (sem mudanças)
2. Upgrade Redis → ElastiCache cache.t2.micro
3. Add DLQ handling (retry backoff)
4. CloudWatch metrics export
5. Monitoring dashboard
```

**Custo:**
- ElastiCache cache.t2.micro: **$15/mês**
- BullMQ: **$0** (open source)
- CloudWatch: **$5/mês**
- **Total: ~$20/mês**

---

### **Pilar 4: Observability → CloudWatch + X-Ray**

**Por que CloudWatch (não Sentry)?**
- ✅ Integrado com AWS
- ✅ Structured logging (JSON)
- ✅ Alarms + Dashboards
- ✅ Cost: $15/mês vs Sentry $200+/mês
- ✅ X-Ray para distributed tracing (Phase 3)

**Implementação:**
```
1. CloudWatch Logs: JSON structured logging
2. CloudWatch Insights: SQL queries
3. Alarms: Error rate, latency, CPU, memory
4. Dashboard: Real-time metrics
5. Log retention: 7 dias (development), 30 dias (production)
```

**Custo:**
- CloudWatch Logs ingest: **$0.50/GB**
- CloudWatch Alarms: **$0.10 per alarm** (50 alarms = $5)
- Dashboard: **Free**
- **Total: ~$15/mês** (100GB ingestion)

---

### **Pilar 5: Database & Secrets**

✅ **Já implementado em Phase 1:**
- RDS PostgreSQL t2.small: **$50/mês**
- AWS Secrets Manager: **Free** (25 secrets)

---

## 💰 Custo Total Phase 2

| Componente | Custo | Status |
|-----------|-------|--------|
| ECS Fargate | $60 | ✅ Backend agent |
| ALB | $16 | ✅ Backend agent |
| Vercel Pro | $20 | ✅ Frontend agent |
| ElastiCache | $15 | ✅ Phase 1 done |
| CloudWatch | $15 | ✅ Ops agent |
| RDS | $50 | ✅ Phase 1 done |
| **Total** | **$176/mês** | ✅ **70% economia vs original** |

---

## 📋 Agentes Phase 2 (Corrigidos)

### **Agent Backend 2: ECS Fargate + ALB (6h)**
```
1. Docker: Enhance Dockerfile for NestJS (1h)
2. ECR: Setup registry, push image (1h)
3. ECS: Task definition + cluster (2h)
4. ALB: Load balancer + health checks (1.5h)
5. CloudWatch: Logs + alarms (0.5h)
```

### **Agent Frontend 2: Vercel Deployment (2h)**
```
1. GitHub: Connect repo to Vercel (0.5h)
2. Env vars: Configure API_URL, etc (0.5h)
3. Preview: Setup automatic PR deployments (0.5h)
4. Analytics: Enable Vercel analytics (0.5h)
```

### **Agent Ops 2: CloudWatch + Monitoring (3h)**
```
1. CloudWatch Logs: JSON logging middleware (1h)
2. Alarms: Error rate, latency, CPU (1h)
3. Dashboard: Real-time metrics (1h)
```

---

## 🎯 When to Migrate to SQS/EventBridge (Phase 3)

**Only if:**
- ✅ Job volume > 100k jobs/day
- ✅ Need cross-service async (microservices communication)
- ✅ Business logic requires event-driven architecture

**Not Phase 2 concern — focus on observability & scaling first.**

---

## Summary

**Phase 2 Strategic Goals:**
1. ✅ Scale API horizontally (ECS Fargate)
2. ✅ Deploy frontend on Vercel (CDN + auto-deploy)
3. ✅ Optimize cache (ElastiCache, 80% cheaper)
4. ✅ Centralize observability (CloudWatch)
5. ✅ Cost: $176/mês (vs $715/mês with original plan = **75% savings**)

**Focus: Operational maturity, not premature optimization.**
