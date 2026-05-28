# Webhooks - Referência Técnica

## Estrutura de Arquivos

```
services/api/
├── src/
│   ├── app.module.ts (WebhookModule importado)
│   └── modules/
│       └── webhook/
│           ├── webhook.module.ts          # Módulo NestJS
│           ├── webhook.service.ts         # Lógica principal (CRUD, trigger, retry)
│           ├── webhook.controller.ts      # Endpoints admin
│           ├── webhook.processor.ts       # Worker BullMQ para async delivery
│           └── webhook-events.ts          # Helpers para disparar eventos
│
├── prisma/
│   ├── schema.prisma               # Models Webhook e WebhookLog
│   └── migrations/
│       └── 1748496000_.../migration.sql   # Create tables

apps/web/
└── app/
    └── (dashboard)/
        └── admin/
            └── webhooks/
                └── page.tsx                # UI admin para gerenciar webhooks

docs/
├── WEBHOOKS_GUIDE.md               # Documentação completa com exemplos
└── WEBHOOK_INTEGRATION_EXAMPLES.md # Exemplos de integração por módulo
```

## Componentes Principais

### 1. WebhookService (`webhook.service.ts`)

**Responsabilidades:**
- CRUD de webhooks (create, update, delete, list)
- Disparar eventos (trigger)
- Registrar logs de tentativas
- Validar e assinar payloads HMAC-SHA256
- Testar webhooks

**Métodos principais:**

```typescript
// Criar webhook
create(dto: CreateWebhookDto): Promise<Webhook>

// Deletar webhook
delete(webhookId: string): Promise<void>

// Listar webhooks (com filtro de ativo)
list(ativo?: boolean): Promise<Webhook[]>

// Obter webhook específico
getById(webhookId: string): Promise<Webhook>

// Atualizar webhook
update(webhookId: string, dto: Partial<CreateWebhookDto>): Promise<Webhook>

// Ativar/desativar webhook
toggleActive(webhookId: string, ativo: boolean): Promise<Webhook>

// Disparar evento para todos os webhooks inscritos
trigger(dto: TriggerEventDto): Promise<void>

// Registrar log de tentativa
logWebhookAttempt(
  webhookId: string,
  evento: string,
  payload: Record<string, any>,
  status: number | null,
  resposta: string | null,
  tentativa: number
): Promise<void>

// Listar logs de um webhook
getLogs(webhookId: string, filters: WebhookLogFilters): Promise<{logs, total, limit, offset}>

// Testar webhook enviando payload de teste
test(webhookId: string): Promise<{sucesso: boolean, status?: number, resposta?: string, erro?: string}>

// Validar assinatura HMAC (método estático)
static validateSignature(secret: string, payload: string, signature: string): boolean
```

### 2. WebhookProcessor (`webhook.processor.ts`)

**Responsabilidades:**
- Processar jobs de webhook da fila BullMQ
- Enviar requisição HTTP POST para URL registrada
- Registrar resultado (sucesso/falha)
- Trigger de retries automáticos com backoff

**Implementação:**
```typescript
@Processor(QUEUE_WEBHOOKS)
export class WebhookProcessor {
  @Process()
  async handleWebhook(job: Job<WebhookJob>)
}
```

**Job Structure:**
```typescript
interface WebhookJob {
  webhookId: string
  url: string
  payload: Record<string, any>
  signature: string
}
```

**Retry Configuration:**
```
Delays (segundos): [0, 300, 1800]
Attempts: 3
Backoff: 1000ms inicial
```

### 3. WebhookController (`webhook.controller.ts`)

**Base Path:** `/api/v1/admin/webhooks`

**Endpoints:**

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/` | Criar webhook |
| GET | `/` | Listar webhooks |
| GET | `/:id` | Obter webhook |
| PATCH | `/:id` | Atualizar webhook |
| PATCH | `/:id/toggle` | Ativar/desativar |
| DELETE | `/:id` | Deletar webhook |
| POST | `/:id/test` | Testar webhook |
| GET | `/:id/logs` | Listar logs |

**Autenticação:** JwtAuthGuard + RolesGuard (ADMIN only)

### 4. WebhookEvents (`webhook-events.ts`)

**Helpers para disparar eventos específicos:**

```typescript
@Injectable()
export class WebhookEvents {
  async onUserSignup(usuarioId, nome, email, tipo)
  async onKycApproved(usuarioId, documentos)
  async onKycRejected(usuarioId, motivo, documentos)
  async onCreditApproved(creditoId, usuarioId, valorAprovado, prazo, taxa)
  async onCreditRejected(creditoId, usuarioId, motivo)
  async onWorkCompleted(obraId, creditoId, usuarioId, nome)
  async onStageApproved(etapaId, obraId, creditoId, usuarioId, etapa)
  async onStageRejected(etapaId, obraId, creditoId, usuarioId, etapa, motivo)
  async onPaymentReleased(liberacaoId, creditoId, usuarioId, valor)
}
```

## Database Schema

### Webhook Table

```sql
CREATE TABLE "Webhook" (
    "webhookId"   TEXT PRIMARY KEY DEFAULT uuid(),
    "url"         TEXT NOT NULL,
    "secret"      TEXT NOT NULL,
    "eventos"     TEXT[] NOT NULL,
    "ativo"       BOOLEAN NOT NULL DEFAULT true,
    "criadoEm"    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP NOT NULL
);

CREATE INDEX "Webhook_ativo_idx" ON "Webhook"("ativo");
CREATE INDEX "Webhook_criadoEm_idx" ON "Webhook"("criadoEm");
```

### WebhookLog Table

```sql
CREATE TABLE "WebhookLog" (
    "logId"       TEXT PRIMARY KEY DEFAULT uuid(),
    "webhookId"   TEXT NOT NULL REFERENCES "Webhook"("webhookId") ON DELETE CASCADE,
    "evento"      TEXT NOT NULL,
    "payload"     JSONB NOT NULL,
    "status"      INTEGER,
    "resposta"    TEXT,
    "tentativas"  INTEGER DEFAULT 1,
    "proxImagem"  TIMESTAMP,
    "timestamp"   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "WebhookLog_webhookId_idx" ON "WebhookLog"("webhookId");
CREATE INDEX "WebhookLog_evento_idx" ON "WebhookLog"("evento");
CREATE INDEX "WebhookLog_timestamp_idx" ON "WebhookLog"("timestamp");
CREATE INDEX "WebhookLog_webhookId_timestamp_idx" ON "WebhookLog"("webhookId", "timestamp");
```

## Payload Structure

### Evento Genérico

```json
{
  "id": "string (UUID)",
  "evento": "string (evento type)",
  "dados": "object (event-specific data)",
  "timestamp": "string (ISO 8601)"
}
```

### Headers HTTP

```
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-hex>
X-Webhook-ID: <webhook-id>
X-Webhook-Delivery: <evento-uuid>
```

### Exemplo de Assinatura

```typescript
// Payload
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "evento": "user.signup",
  "dados": { "usuarioId": "...", "nome": "..." },
  "timestamp": "2024-05-28T15:30:00Z"
}

// Secret
"abc123def456..."

// HMAC-SHA256
crypto
  .createHmac("sha256", secret)
  .update(JSON.stringify(payload))
  .digest("hex")
```

## Fluxo de Execução

### Disparar Evento

```
1. Serviço chama webhookEvents.onUserSignup(...)
   ↓
2. WebhookService.trigger() é chamado
   ↓
3. Query busca webhooks ativos inscritos no evento
   ↓
4. Para cada webhook:
   a. Cria payload assinado (HMAC-SHA256)
   b. Cria Job BullMQ na fila "webhooks"
   c. Job é enfileirado com retry config
   ↓
5. BullMQ processa job quando disponível
   ↓
6. WebhookProcessor.handleWebhook() é executado
   a. Envia POST request para URL do webhook
   b. Registra resultado em WebhookLog
   c. Se falha → BullMQ retenta automaticamente
   ↓
7. Após 3 tentativas → Job marcado como completo
```

### Retry Logic

```
Tentativa 1: Imediata (t = 0s)
Tentativa 2: 5 minutos depois (t = 5min)
Tentativa 3: 30 minutos depois (t = 30min)

Se todas falharem:
- Log é marcado como falho
- Webhook pode ser retestado via admin
```

## Integração em Serviços

### Exemplo: Módulo de Usuários

```typescript
// usuarios.module.ts
import { WebhookModule } from "../webhook/webhook.module";

@Module({
  imports: [PrismaModule, WebhookModule],
  providers: [UsuariosService],
})
export class UsuariosModule {}

// usuarios.service.ts
constructor(
  private prisma: PrismaService,
  private webhookEvents: WebhookEvents
) {}

async createUsuario(data: CreateUsuarioDto) {
  const usuario = await this.prisma.usuario.create({ data });
  
  // Webhook disparo (sem bloquear fluxo)
  try {
    await this.webhookEvents.onUserSignup(
      usuario.usuarioId,
      usuario.nome,
      usuario.email,
      usuario.tipo
    );
  } catch (error) {
    // Log mas não bloqueia
    console.error("Webhook error:", error);
  }
  
  return usuario;
}
```

## Validação de Assinatura (Cliente)

### Node.js/TypeScript

```typescript
import crypto from "crypto";

function validateWebhookSignature(
  secret: string,
  payload: string,
  signature: string
): boolean {
  const calculated = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculated)
  );
}
```

### Python

```python
import hmac
import hashlib

def validate_webhook_signature(secret, payload, signature):
    calculated = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, calculated)
```

## Admin UI

**Location:** `/apps/web/app/(dashboard)/admin/webhooks/page.tsx`

**Funcionalidades:**
- Listagem de webhooks com status e eventos
- Criar novo webhook com form
- Editar webhook (URL e eventos)
- Deletar webhook
- Testar webhook (envia evento de teste)
- Ver logs com filtros de evento e status
- Toggle ativo/inativo

## Monitoramento

### Métricas Importantes

1. **Taxa de Entrega:**
   - Logs com status 200-204 / Total de logs
   - Target: > 99%

2. **Latência Média:**
   - Tempo entre evento e entrega com sucesso
   - Target: < 5 segundos

3. **Taxa de Retenção:**
   - Quantos eventos precisam de retry
   - Target: < 1%

4. **Webhook Health:**
   - Monitorar webhooks com muitas falhas
   - Alertar se > 10% de falha em 1 hora

### Queries de Monitoramento

```sql
-- Taxa de sucesso
SELECT
  COUNT(CASE WHEN status >= 200 AND status < 300 THEN 1 END) as success,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(CASE WHEN status >= 200 AND status < 300 THEN 1 END) / COUNT(*), 2) as success_rate
FROM "WebhookLog"
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Webhooks com mais falhas
SELECT
  w.webhookId,
  w.url,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN wl.status IS NULL OR wl.status >= 400 THEN 1 END) as failed_attempts
FROM "Webhook" w
LEFT JOIN "WebhookLog" wl ON w.webhookId = wl.webhookId
WHERE wl.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY w.webhookId
ORDER BY failed_attempts DESC
LIMIT 10;

-- Latência média por evento
SELECT
  evento,
  AVG(EXTRACT(EPOCH FROM (timestamp - criadoEm))) as avg_latency_seconds,
  COUNT(*) as count
FROM "WebhookLog"
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY evento
ORDER BY avg_latency_seconds DESC;
```

## Segurança

### Best Practices Implementadas

1. ✅ HMAC-SHA256 signing (timing-safe comparison)
2. ✅ Webhook secrets (random 32-byte hex per webhook)
3. ✅ HTTPS enforcement recomendado (URL validation)
4. ✅ Rate limiting via throttler guard
5. ✅ Admin-only endpoints (RolesGuard)
6. ✅ Timeout 30s em requisições
7. ✅ Logging de tentativas (auditoria)

### Recomendações

1. Sempre validar assinatura no endpoint receptor
2. Usar HTTPS nas URLs dos webhooks
3. Implementar idempotência (usar event ID)
4. Rotacionar secrets a cada 6 meses
5. Monitorar taxa de falhas
6. Manter logs por 90 dias (retention policy)
7. Alertar em falhas repetidas

## Troubleshooting

### Webhook não é entregue

```typescript
// 1. Verificar se webhook existe e está ativo
const webhook = await webhookService.getById(webhookId);
if (!webhook.ativo) console.log("Webhook inativo!");

// 2. Verificar se está inscrito no evento
if (!webhook.eventos.includes("user.signup")) {
  console.log("Webhook não inscrito neste evento!");
}

// 3. Verificar logs
const logs = await webhookService.getLogs(webhookId, {
  limit: 10
});
logs.forEach(log => {
  console.log(`Status: ${log.status}, Tentativa: ${log.tentativas}`);
});

// 4. Testar webhook
const testResult = await webhookService.test(webhookId);
console.log(testResult);
```

### Performance

**Otimizações aplicadas:**

1. Indexes em Webhook.ativo e Webhook.criadoEm
2. Indexes em WebhookLog.webhookId e WebhookLog.timestamp
3. Jobs BullMQ com removeOnComplete (cleanup automático)
4. Logs com paginação default limit=50
5. Async processing (não bloqueia fluxo principal)

**Como melhorar:**

```typescript
// Use batch processing para múltiplos eventos
async triggerBatch(events: TriggerEventDto[]) {
  const promises = events.map(e => this.trigger(e));
  await Promise.allSettled(promises);
}

// Implemente circuit breaker para webhooks com falhas
if (failureRate > 0.5) {
  webhook.ativo = false;
  // Notificar admin
}

// Use compression para payloads grandes
Content-Encoding: gzip
```

## Próximas Evoluções

1. **Webhook Filters:** Permitir filtros nos dados antes de enviar
2. **Transformation:** Transformar payload antes de enviar
3. **Rate Limiting:** Limitar frequência de eventos por tipo
4. **Webhook Signing Key Rotation:** Automatizar rotação de secrets
5. **Delivery Status Page:** UI pública mostrando status
6. **Event Replay:** Permitir re-envio de eventos antigos
7. **Webhook Analytics:** Dashboard de métricas
8. **Conditional Webhooks:** Disparar apenas se condições forem atendidas

## Comandos Úteis

```bash
# Ver todos os webhooks
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/admin/webhooks

# Criar webhook
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://seu-servidor.com/webhook","eventos":["user.signup"]}' \
  http://localhost:4000/api/v1/admin/webhooks

# Testar webhook
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/admin/webhooks/WEBHOOK_ID/test

# Ver logs
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/v1/admin/webhooks/WEBHOOK_ID/logs?limit=50"

# Deletar webhook
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/admin/webhooks/WEBHOOK_ID
```

## Referências

- [WEBHOOKS_GUIDE.md](./WEBHOOKS_GUIDE.md) - Documentação com exemplos
- [WEBHOOK_INTEGRATION_EXAMPLES.md](./WEBHOOK_INTEGRATION_EXAMPLES.md) - Integração nos módulos
- BullMQ: https://docs.bullmq.io
- NestJS: https://docs.nestjs.com
