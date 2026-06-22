# 🏗️ IMOBI ARCHITECTURE — Resiliente, Escalável e API First

**Status**: Arquitetura Profissional para Fintech  
**Versão**: 1.0  
**Data**: Junho 2026

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
│                     CLIENTE (Web + Mobile)                      │
│              (Next.js 14 SSR | Expo + React Native)            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  CDN Cloudflare │
                    │   (Assets,etc)  │
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
                  ┌──────▼──────┐         ┌─────▼────┐         ┌────────▼────┐
                  │  Services   │         │ Services │         │  Services   │
                  │             │         │          │         │             │
                  │ • KYC       │         │ • Obras  │         │ • Análise   │
                  │ • Auth      │         │ • Etapas │         │ • Reports   │
                  │ • Score     │         │ • Crédito│         │ • Admin     │
                  └──────┬──────┘         └────┬─────┘         └────────┬────┘
                         │                     │                        │
                         └─────────────┬───────┴────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
          ┌─────────▼──────┐  ┌────────▼────────┐  ┌────▼──────────┐
          │   PostgreSQL   │  │     Redis       │  │  BullMQ Queue │
          │   (Primary)    │  │  (Cache Layer)  │  │  (Async Jobs) │
          └────────────────┘  └─────────────────┘  └────────────────┘
                    │
          ┌─────────▼──────────┐
          │  PostGIS (Geo)     │
          │  Indexes, Replicas │
          └────────────────────┘
```

---

## 🔄 PADRÕES DE RESILIÊNCIA

### 1. **Circuit Breaker**

```typescript
// NestJS com @nestjs/bull + resilience4j

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

**Estados**:
- ✅ CLOSED: Normal, requisições passam
- ⏳ OPEN: Falhas detectadas, requisições rejeitadas
- 🔄 HALF_OPEN: Tentando recuperar

**Configuração**:
```yaml
circuitBreaker:
  failureThreshold: 50%      # % de falhas para abrir
  successThreshold: 2        # Sucessos para fechar
  waitDurationInHalfOpenState: 60000  # 1 min
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

**Tempo de retry**:
- Tentativa 1: 100ms
- Tentativa 2: 200ms  
- Tentativa 3: 400ms

### 3. **Timeout + Fallback**

```typescript
async getCreditoQuota(usuarioId: string) {
  try {
    return await Promise.race([
      this.scoreService.calcular(usuarioId),  // 5s timeout
      new Promise((_, reject) =>
        setTimeout(() => reject('Timeout'), 5000)
      ),
    ]);
  } catch (error) {
    // Fallback: retornar valor em cache ou padrão
    return this.cache.get(`credito:${usuarioId}`) || DEFAULT_QUOTA;
  }
}
```

### 4. **Bulkhead Pattern** (Isolamento de recursos)

```typescript
// Filas separadas por criticidade
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

### 1. **Stateless Services**

```typescript
// ❌ ERRADO - tem state
export class ObraService {
  private cache = new Map();  // NÃO!
}

// ✅ CORRETO - sem state
@Injectable()
export class ObraService {
  constructor(private redis: RedisService) {}
  
  async getObra(id: string) {
    // Busca de Redis (compartilhado)
    return this.redis.get(`obra:${id}`);
  }
}
```

### 2. **Horizontal Scaling**

```yaml
# docker-compose.yml
services:
  api-1:
    image: imobi-api:latest
    environment:
      INSTANCE_ID: api-1
  api-2:
    image: imobi-api:latest
    environment:
      INSTANCE_ID: api-2
  api-3:
    image: imobi-api:latest
    environment:
      INSTANCE_ID: api-3
  
  # Load balancer
  nginx:
    image: nginx:alpine
    config: |
      upstream api {
        least_conn;
        server api-1:3000;
        server api-2:3000;
        server api-3:3000;
      }
```

### 3. **Data Sharding** (Por Tenant)

```typescript
// Estratégia: Sharding por usuarioId

interface ShardingStrategy {
  getShardKey(usuarioId: string): number;
  getDatabase(shard: number): PrismaClient;
}

@Injectable()
export class ShardedPrismaService implements ShardingStrategy {
  private shards: Map<number, PrismaClient> = new Map();
  
  getShardKey(usuarioId: string): number {
    // Hash consistente
    const hash = usuarioId.split('').reduce((acc, char) => 
      ((acc << 5) - acc) + char.charCodeAt(0), 0
    );
    return Math.abs(hash) % SHARD_COUNT;  // 4 shards
  }
  
  async getObra(usuarioId: string, obraId: string) {
    const shard = this.getShardKey(usuarioId);
    const db = this.shards.get(shard);
    return db.obra.findUnique({ where: { id: obraId } });
  }
}
```

### 4. **Cache em Camadas**

```
Requisição → Browser Cache (1 hora)
         ↓
         → CDN (Cloudflare, 10 min)
         ↓
         → Redis (1-30 min)
         ↓
         → PostgreSQL (Banco de dados)
```

**Implementação**:

```typescript
async getObraDetalhes(id: string) {
  // Nível 1: Cache local
  const cached = this.localCache.get(`obra:${id}`);
  if (cached) return cached;
  
  // Nível 2: Redis
  const redisCached = await this.redis.get(`obra:${id}`);
  if (redisCached) {
    this.localCache.set(`obra:${id}`, redisCached);
    return redisCached;
  }
  
  // Nível 3: Banco
  const obra = await this.db.obra.findUnique({ 
    where: { id },
    include: { etapas: true, creditos: true }
  });
  
  // Popula caches
  await this.redis.set(`obra:${id}`, obra, 'EX', 600);
  this.localCache.set(`obra:${id}`, obra);
  
  return obra;
}
```

---

## 🔌 API FIRST DESIGN

### 1. **OpenAPI 3.0 Specification**

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
      parameters:
        - name: usuarioId
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Lista de obras
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Obra'
        '401':
          description: Não autorizado
        '429':
          description: Rate limit excedido

  /obras/{id}:
    get:
      summary: Obter detalhes da obra
      operationId: obterObra
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Obra encontrada
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ObraDetalhes'

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
        dataCriacao:
          type: string
          format: date-time
```

### 2. **API Versioning**

```typescript
// v1 controllers
@Controller('v1/obras')
export class ObraControllerV1 {
  @Get(':id')
  async getObra(@Param('id') id: string) {
    // Versão 1: retorna apenas dados básicos
    return { id, nome, status };
  }
}

// v2 controllers (nova versão, backward compatible)
@Controller('v2/obras')
export class ObraControllerV2 {
  @Get(':id')
  async getObra(@Param('id') id: string) {
    // Versão 2: mais dados, melhor performance
    return {
      id, nome, status,
      etapas: [...],
      creditos: [...],
      documents: [...],
      metadata: { ... }
    };
  }
}
```

### 3. **Rate Limiting por Tier**

```typescript
@Controller('api/v1')
@UseGuards(RateLimitGuard)
export class ApiController {
  @RateLimit({
    windowMs: 60000,  // 1 minuto
    max: {
      FREE: 100,          // 100 req/min
      PREMIUM: 1000,      // 1000 req/min
      ENTERPRISE: 10000,  // 10k req/min
    }
  })
  @Get('obras')
  async listarObras() {
    // ...
  }
}
```

---

## 📊 OBSERVABILIDADE

### 1. **Logging Estruturado (JSON)**

```typescript
@Injectable()
export class LoggerService {
  log(message: string, context: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      context,
      traceId: this.getTraceId(),
      spanId: this.getSpanId(),
      hostname: os.hostname(),
      service: 'imobi-api',
      version: '1.0.0',
    };
    
    console.log(JSON.stringify(logEntry));
    // Envia para Elasticsearch/CloudWatch
  }
}
```

### 2. **Distributed Tracing (OpenTelemetry)**

```typescript
import { trace, context } from '@opentelemetry/api';

const tracer = trace.getTracer('imobi-api');

async function processarEtapa(etapaId: string) {
  const span = tracer.startSpan('processar_etapa', {
    attributes: {
      'etapa.id': etapaId,
      'user.id': currentUserId,
    }
  });
  
  return context.with(
    trace.setSpan(context.active(), span),
    async () => {
      // Operações são automaticamente trackeadas
      await this.validateGPS(etapaId);
      await this.processarDocumentos(etapaId);
      await this.triggearAprovacao(etapaId);
      
      span.end();
    }
  );
}
```

### 3. **Métricas em Tempo Real (Prometheus)**

```typescript
@Injectable()
export class MetricsService {
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
  
  async criarObra(data: CreateObraDto) {
    const start = Date.now();
    
    const obra = await this.db.obra.create({ data });
    
    this.obrasCriadas.inc({
      status: obra.status,
      tipo: obra.tipo,
    });
    
    this.tempoProcessamento.observe(Date.now() - start);
    
    return obra;
  }
}
```

---

## 🔐 SEGURANÇA

### 1. **Zero Trust Architecture**

```typescript
// Toda requisição requer autenticação + autorização

@UseGuards(AuthGuard, AuthorizationGuard)
@Controller('api/v1/obras')
export class ObraController {
  @Get(':id')
  @RequirePermission('obras:read')
  async getObra(@Param('id') id: string, @CurrentUser() user: User) {
    // Verificar se usuário tem acesso a essa obra
    const obra = await this.db.obra.findUnique({ where: { id } });
    
    if (obra.usuarioId !== user.id && !user.roles.includes('ADMIN')) {
      throw new ForbiddenException('Acesso negado');
    }
    
    return obra;
  }
}
```

### 2. **Encryption at Rest & Transit**

```yaml
# PostgreSQL: Column Encryption
database:
  encryption:
    algorithm: AES-256-GCM
    columns:
      - usuarios.cpf
      - usuarios.telefone
      - documentos.conteudo
      - creditos.valores

# TLS 1.3 para todas conexões
api:
  ssl:
    enabled: true
    version: TLSv1.3
    ciphers: ECDHE-ECDSA-AES256-GCM-SHA384

# Redis encryption
redis:
  requirePass: ${REDIS_PASSWORD}
  tls: true
  tlsPort: 6380
```

### 3. **Audit Log**

```typescript
@Injectable()
export class AuditService {
  async log(action: AuditAction) {
    await this.db.auditLog.create({
      data: {
        action: action.type,  // CREATE, UPDATE, DELETE
        entity: action.entity,
        entityId: action.entityId,
        userId: action.userId,
        changes: action.before ? {
          before: action.before,
          after: action.after,
        } : undefined,
        timestamp: new Date(),
        ipAddress: action.ipAddress,
      }
    });
    
    // Imutável - nunca pode ser modificado
  }
}
```

---

## 🚀 DEPLOYMENT STRATEGY

### 1. **Blue-Green Deployment**

```yaml
# Blue (Atual)
deployment-blue:
  replicas: 3
  image: imobi-api:1.0.0
  status: ACTIVE (100% tráfego)

# Green (Nova versão)
deployment-green:
  replicas: 3
  image: imobi-api:1.1.0
  status: STAGING (0% tráfego, tests)

# Estratégia:
# 1. Deploy nova versão em Green
# 2. Rodar testes E2E
# 3. Gradualmente mover tráfego (10%, 50%, 100%)
# 4. Manter Blue pronto para rollback instantâneo
```

### 2. **Canary Release**

```yaml
# Versão 1.0.0 (Estável)
stable:
  replicas: 6
  traffic: 95%

# Versão 1.1.0 (Canary - Novo)
canary:
  replicas: 1
  traffic: 5%
  metrics:
    errorRate: < 0.1%
    latency: p99 < 500ms
    
# Se canary OK após 1 hora → Promover a 100%
# Se canary falha → Rollback automático
```

### 3. **Feature Flags**

```typescript
@Injectable()
export class FeatureFlagService {
  async isEnabled(feature: string, userId?: string): Promise<boolean> {
    // Baseado em:
    // - % do tráfego
    // - User ID (A/B testing)
    // - Tenant
    // - Feature stage (alpha, beta, stable)
    
    const flag = await this.redis.get(`feature:${feature}`);
    
    if (flag?.rolloutPercentage === 100) return true;
    if (flag?.rolloutPercentage === 0) return false;
    
    // Determinístico por usuário
    const hash = hashUserId(userId);
    return (hash % 100) < flag.rolloutPercentage;
  }
}

// Uso:
if (await this.featureFlags.isEnabled('novo-motor-score', userId)) {
  return this.newScoringEngine.calculate(usuario);
} else {
  return this.legacyScoringEngine.calculate(usuario);
}
```

---

## 💾 DATA MANAGEMENT

### 1. **Read Replicas**

```prisma
// Prisma com Read Replicas

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Replicas para leitura pesada
  extensions = {
    readOnly = {
      host     = env("DATABASE_REPLICA_URL")
      strategy = "LeastConnections"
    }
  }
}

// Uso automático de replicas para queries read-only
```

### 2. **Backup & Recovery**

```bash
# Backup automático a cada 6 horas
0 */6 * * * /scripts/backup-postgresql.sh

# Retenção: 30 dias
# Teste de recovery: semanal

# WAL (Write-Ahead Logging)
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://imobi-backups/wal/%f'
```

### 3. **Event Sourcing** (Para auditoria completa)

```typescript
@Entity()
export class Evento {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  aggregateId: string;  // ID da obra/crédito
  
  @Column()
  tipo: 'ObraCriada' | 'EtapaAprovada' | 'CreditoLiberado' | ...;
  
  @Column('json')
  payload: any;
  
  @Column()
  timestamp: Date;
  
  @Column()
  versionAgregate: number;
}

// Reconstruir estado de uma obra:
async getObraPorEventos(obraId: string) {
  const eventos = await this.db.evento.findMany({
    where: { aggregateId: obraId },
    orderBy: { timestamp: 'asc' },
  });
  
  let obra = {}; // Estado inicial
  
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
|--------|------------|---------|
| **Circuit Breaker** | Falhas em serviços externos | Chamadas para SMS/Email |
| **Retry** | Falhas transitórias | Network timeouts |
| **Bulkhead** | Isolamento de recursos | Filas por criticidade |
| **Cache** | Dados lidos frequentemente | Obras, créditos, usuários |
| **CQRS** | Reads e writes diferentes | Relatórios pesados |
| **Event Sourcing** | Auditoria completa | Aprovações, transações |
| **Saga** | Transações distribuídas | Liberação de crédito |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Documentação OpenAPI 100% atualizada
- [ ] Circuit breakers em todos serviços externos
- [ ] Logging estruturado em JSON
- [ ] Distributed tracing em todas operações críticas
- [ ] Cache em 3 camadas (browser, Redis, DB)
- [ ] Rate limiting por tier
- [ ] Backup + Recovery testados
- [ ] Blue-green deployment pronto
- [ ] Feature flags implementadas
- [ ] Testes de carga (100+ usuários simultâneos)
- [ ] Monitoramento 24/7 (PagerDuty)
- [ ] RTO/RPO definidos e testados

---

**Próximo Passo**: Qual dessas áreas você quer detalhar primeiro?
- Implementar Circuit Breaker?
- Setup de Redis Cache?
- OpenAPI specification?
- Observabilidade completa?
