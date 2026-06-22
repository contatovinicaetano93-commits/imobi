# 🏗️ IMOBI ARCHITECTURE — Resiliente, Escalável e API First

**Status**: Arquitetura Profissional para Fintech  
**Versão**: 1.0  
**Data**: Junho 2026

**Local path (Windows)**: `C:\Users\Usuário\Desktop\vini Claude\imobi`

---

## 🎯 PRINCÍPIOS FUNDADORES

### 1. **API First**

- ✅ Contrato primeiro, implementação depois
- ✅ Documentação executável (OpenAPI 3.0)
- ✅ Versionamento semântico obrigatório

### 2. **Resiliência**

- ✅ Tolerância a falhas parciais
- ✅ Degradação graciosa
- ✅ Recovery automático

### 3. **Escalabilidade**

- ✅ Horizontal scaling (sem state)
- ✅ Sharding inteligente (por tenant/obra)
- ✅ Cache em camadas (Redis, CDN, browser)

### 4. **Observabilidade**

- ✅ Logs estruturados (JSON)
- ✅ Tracing distribuído (OpenTelemetry)
- ✅ Métricas em tempo real

---

## 🏛️ ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENTE (Web + Mobile)                                            │
│ (Next.js 14 SSR | Expo + React Native)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ CDN Cloudflare  │
                    │ (Assets, etc)   │
                    └─────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
┌───────▼──────────┐                    ┌────────▼────────┐
│ Next.js Frontend │                    │ API Gateway     │
│ (Edge Runtime)   │                    │ (Kong/Envoy)    │
└──────────────────┘                    └────────┬────────┘
                                                   │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼──────┐         ┌─────▼────┐          ┌───────▼────┐
│ Services     │         │ Services │          │ Services   │
│ • KYC        │         │ • Obras  │          │ • Análise  │
│ • Auth       │         │ • Etapas │          │ • Reports  │
│ • Score      │         │ • Crédito│          │ • Admin    │
└──────┬───────┘         └────┬─────┘          └──────┬─────┘
       │                      │                       │
       └─────────────┬────────┴───────────────────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
┌──────▼──────┐ ┌────▼─────┐ ┌─────▼────────┐
│ PostgreSQL  │ │ Redis    │ │ BullMQ Queue │
│ (Primary)   │ │ (Cache)  │ │ (Async Jobs) │
└──────┬──────┘ └──────────┘ └──────────────┘
       │
┌──────▼──────────┐
│ PostGIS (Geo)   │
│ Indexes, Replicas│
└─────────────────┘
```

---

## 🔄 PADRÕES DE RESILIÊNCIA

### 1. **Circuit Breaker**

```typescript
@Injectable()
export class ResilientObraService {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000,
    monitorInterval: 10000,
  });

  async getObra(id: string) {
    return this.circuitBreaker.execute(async () => {
      return this.database.obra.findUnique({ where: { id } });
    });
  }
}
```

**Estados:**

- ✅ CLOSED: Normal, requisições passam
- ⏳ OPEN: Falhas detectadas, requisições rejeitadas
- 🔄 HALF_OPEN: Tentando recuperar

**Configuração:**

```yaml
circuitBreaker:
  failureThreshold: 50%
  successThreshold: 2
  waitDurationInHalfOpenState: 60000
```

### 2. **Retry com Exponential Backoff**

```typescript
@Injectable()
export class ExternalApiClient {
  private retry = new RetryPolicy({
    maxAttempts: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    multiplier: 2,
  });

  async callExternalService(endpoint: string) {
    return this.retry.execute(() =>
      fetch(endpoint, { timeout: 5000 })
    );
  }
}
```

**Tempo de retry:** 100ms → 200ms → 400ms

### 3. **Timeout + Fallback**

```typescript
async getCreditoQuota(usuarioId: string) {
  try {
    return await Promise.race([
      this.scoreService.calcular(usuarioId),
      new Promise((_, reject) =>
        setTimeout(() => reject('Timeout'), 5000)
      ),
    ]);
  } catch (error) {
    return this.cache.get(`credito:${usuarioId}`) || DEFAULT_QUOTA;
  }
}
```

### 4. **Bulkhead Pattern (Isolamento de recursos)**

```typescript
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'kyc-approval', defaultJobOptions: { attempts: 3 } },
      { name: 'etapa-liberacao', defaultJobOptions: { attempts: 5 } },
      { name: 'notification', defaultJobOptions: { attempts: 1 } },
    ),
  ],
})
export class JobsModule {}
```

---

## 📈 ESCALABILIDADE

### 1. Stateless Services

```typescript
// ❌ ERRADO - tem state
export class ObraService {
  private cache = new Map();
}

// ✅ CORRETO - sem state
@Injectable()
export class ObraService {
  constructor(private redis: RedisService) {}

  async getObra(id: string) {
    return this.redis.get(`obra:${id}`);
  }
}
```

### 2. Horizontal Scaling

```yaml
services:
  api-1:
    image: imobi-api:latest
    environment:
      INSTANCE_ID: api-1
  api-2:
    image: imobi-api:latest
    environment:
      INSTANCE_ID: api-2
  nginx:
    image: nginx:alpine
```

### 3. Data Sharding (Por Tenant)

```typescript
@Injectable()
export class ShardedPrismaService implements ShardingStrategy {
  private shards: Map<number, PrismaClient> = new Map();

  getShardKey(usuarioId: string): number {
    const hash = usuarioId.split('').reduce((acc, char) =>
      ((acc << 5) - acc) + char.charCodeAt(0), 0
    );
    return Math.abs(hash) % SHARD_COUNT;
  }

  async getObra(usuarioId: string, obraId: string) {
    const shard = this.getShardKey(usuarioId);
    const db = this.shards.get(shard)!;
    return db.obra.findUnique({ where: { id: obraId } });
  }
}
```

### 4. Cache em Camadas

```
Requisição → Browser Cache (1 hora)
         ↓ → CDN (Cloudflare, 10 min)
         ↓ → Redis (1-30 min)
         ↓ → PostgreSQL
```

```typescript
async getObraDetalhes(id: string) {
  const cached = this.localCache.get(`obra:${id}`);
  if (cached) return cached;

  const redisCached = await this.redis.get(`obra:${id}`);
  if (redisCached) {
    this.localCache.set(`obra:${id}`, redisCached);
    return redisCached;
  }

  const obra = await this.db.obra.findUnique({
    where: { id },
    include: { etapas: true, creditos: true },
  });

  await this.redis.set(`obra:${id}`, obra, 'EX', 600);
  this.localCache.set(`obra:${id}`, obra);
  return obra;
}
```

---

## 🔌 API FIRST DESIGN

### 1. OpenAPI 3.0 Specification

```yaml
openapi: 3.0.0
info:
  title: Imobi API
  version: 1.0.0
  description: Fintech API para crédito imobiliário

servers:
  - url: https://api.imobi.com.br/v1
    description: Production

paths:
  /obras:
    get:
      summary: Listar obras do usuário
      operationId: listarObras
      responses:
        '200':
          description: Lista de obras
        '401':
          description: Não autorizado
        '429':
          description: Rate limit excedido

  /obras/{id}:
    get:
      summary: Obter detalhes da obra
      operationId: obterObra
      responses:
        '200':
          description: Obra encontrada

components:
  schemas:
    Obra:
      type: object
      required: [id, nome, status]
      properties:
        id:
          type: string
          format: uuid
        nome:
          type: string
        status:
          type: string
          enum: [CRIADA, APROVADA, ATIVA, CONCLUIDA, CANCELADA]
```

### 2. API Versioning

```typescript
@Controller('v1/obras')
export class ObraControllerV1 {
  @Get(':id')
  async getObra(@Param('id') id: string) {
    return { id, nome, status };
  }
}

@Controller('v2/obras')
export class ObraControllerV2 {
  @Get(':id')
  async getObra(@Param('id') id: string) {
    return { id, nome, status, etapas: [], creditos: [], documents: [] };
  }
}
```

### 3. Rate Limiting por Tier

```typescript
@RateLimit({
  windowMs: 60000,
  max: {
    FREE: 100,
    PREMIUM: 1000,
    ENTERPRISE: 10000,
  },
})
@Get('obras')
async listarObras() {}
```

**KYC endpoint (Section 5):**

- `POST /api/v1/kyc/upload` — metadata + URL
- `POST /api/v1/kyc/upload-arquivo` — multipart/form-data
- Returns document record + signed URL for preview

---

## 📊 OBSERVABILIDADE

### 1. Logging Estruturado (JSON)

```typescript
@Injectable()
export class LoggerService {
  log(message: string, context: Record<string, unknown>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
      traceId: this.getTraceId(),
      service: 'imobi-api',
      version: '1.0.0',
    };
    console.log(JSON.stringify(logEntry));
  }
}
```

### 2. Distributed Tracing (OpenTelemetry)

```typescript
const tracer = trace.getTracer('imobi-api');

async function processarEtapa(etapaId: string) {
  const span = tracer.startSpan('processar_etapa', {
    attributes: { 'etapa.id': etapaId },
  });
  try {
    await this.validateGPS(etapaId);
    await this.processarDocumentos(etapaId);
    await this.triggearAprovacao(etapaId);
  } finally {
    span.end();
  }
}
```

### 3. Métricas (Prometheus)

```typescript
private obrasCriadas = new Counter({
  name: 'obras_criadas_total',
  help: 'Total de obras criadas',
  labelNames: ['status', 'tipo'],
});

private tempoProcessamento = new Histogram({
  name: 'etapa_processamento_ms',
  help: 'Tempo de processamento de etapa',
  buckets: [100, 500, 1000, 5000, 10000],
});
```

---

## 🔐 SEGURANÇA

### 1. Zero Trust Architecture

```typescript
@UseGuards(AuthGuard, AuthorizationGuard)
@Controller('api/v1/obras')
export class ObraController {
  @Get(':id')
  @RequirePermission('obras:read')
  async getObra(@Param('id') id: string, @CurrentUser() user: User) {
    const obra = await this.db.obra.findUnique({ where: { id } });
    if (obra.usuarioId !== user.id && !user.roles.includes('ADMIN')) {
      throw new ForbiddenException('Acesso negado');
    }
    return obra;
  }
}
```

### 2. Encryption at Rest & Transit

- PostgreSQL: AES-256-GCM for sensitive columns (CPF, phone)
- TLS 1.3 for all API connections
- Redis with password + TLS

### 3. Audit Log

```typescript
await this.db.auditLog.create({
  data: {
    action: action.type,
    entity: action.entity,
    entityId: action.entityId,
    userId: action.userId,
    changes: { before: action.before, after: action.after },
    timestamp: new Date(),
    ipAddress: action.ipAddress,
  },
});
// Imutável — nunca modificar
```

---

## 🚀 DEPLOYMENT STRATEGY

### 1. Blue-Green Deployment

1. Deploy nova versão em Green
2. Rodar testes E2E
3. Mover tráfego gradualmente (10%, 50%, 100%)
4. Manter Blue para rollback instantâneo

### 2. Canary Release

- Stable: 95% traffic
- Canary: 5% traffic, monitor error rate & latency
- Promote or rollback after validation window

### 3. Feature Flags

```typescript
if (await this.featureFlags.isEnabled('novo-motor-score', userId)) {
  return this.newScoringEngine.calculate(usuario);
}
return this.legacyScoringEngine.calculate(usuario);
```

---

## 💾 DATA MANAGEMENT

### 1. Read Replicas

- Primary for writes
- Replicas for heavy read queries (reports, listings)

### 2. Backup & Recovery

- Backup every 6 hours, 30-day retention
- Weekly recovery tests
- WAL archiving to S3

### 3. Event Sourcing (Auditoria)

```typescript
async getObraPorEventos(obraId: string) {
  const eventos = await this.db.evento.findMany({
    where: { aggregateId: obraId },
    orderBy: { timestamp: 'asc' },
  });
  let obra = {};
  for (const evento of eventos) {
    obra = this.aplicarEvento(obra, evento);
  }
  return obra;
}
```

---

## 🎯 ROADMAP DE IMPLEMENTAÇÃO

### Fase 1 (Semanas 1-2): Fundações

- [ ] OpenAPI 3.0 spec completa
- [ ] Circuit breakers implementados
- [ ] Logging estruturado (ELK stack)
- [ ] Prometheus metrics

### Fase 2 (Semanas 3-4): Escalabilidade

- [ ] Redis cache distribuído
- [ ] Read replicas PostgreSQL
- [ ] Horizontal scaling (Docker/K8s)
- [ ] Sharding preparado

### Fase 3 (Semanas 5-6): Observabilidade

- [ ] Distributed tracing (OpenTelemetry)
- [ ] Sentry error tracking
- [ ] New Relic APM
- [ ] Alertas automáticos

### Fase 4 (Semanas 7-8): Deployment

- [ ] Blue-green deployment
- [ ] Canary releases
- [ ] Feature flags
- [ ] Rollback automático

---

## 📚 PADRÕES RECOMENDADOS

| Padrão | Quando Usar | Exemplo |
|--------|-------------|---------|
| Circuit Breaker | Falhas em serviços externos | SMS/Email |
| Retry | Falhas transitórias | Network timeouts |
| Bulkhead | Isolamento de recursos | Filas por criticidade |
| Cache | Dados lidos frequentemente | Obras, créditos |
| CQRS | Reads e writes diferentes | Relatórios pesados |
| Event Sourcing | Auditoria completa | Aprovações |
| Saga | Transações distribuídas | Liberação de crédito |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Documentação OpenAPI 100% atualizada
- [ ] Circuit breakers em todos serviços externos
- [ ] Logging estruturado em JSON
- [ ] Distributed tracing em operações críticas
- [ ] Cache em 3 camadas (browser, Redis, DB)
- [ ] Rate limiting por tier
- [ ] Backup + Recovery testados
- [ ] Blue-green deployment pronto
- [ ] Feature flags implementadas
- [ ] Testes de carga (100+ usuários simultâneos)
- [ ] Monitoramento 24/7 (PagerDuty)
- [ ] RTO/RPO definidos e testados

---

**Próximo Passo**: Implementar por fase — ver `COLLABORATIVE_WORKSPACE.md` para prioridades Cursor (A–E).
