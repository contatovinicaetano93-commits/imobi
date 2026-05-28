# Guia de Webhooks

## Visão Geral

O sistema de webhooks permite que aplicações externas se inscrevam em eventos do imbobi em tempo real. Quando um evento ocorre, uma requisição HTTP POST é enviada para as URLs registradas com o payload do evento assinado com HMAC-SHA256.

## Eventos Disponíveis

### Usuários

#### `user.signup`
Disparado quando um novo usuário se registra.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "user.signup",
  "dados": {
    "usuarioId": "user-123",
    "nome": "João Silva",
    "email": "joao@example.com",
    "tipo": "TOMADOR"
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

### KYC (Know Your Customer)

#### `user.kyc.approved`
Disparado quando o KYC de um usuário é aprovado.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "user.kyc.approved",
  "dados": {
    "usuarioId": "user-123",
    "kycStatus": "APROVADO",
    "kycDocumentos": [
      {
        "kycDocumentoId": "doc-123",
        "tipo": "RG",
        "status": "APROVADO"
      }
    ]
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

#### `user.kyc.rejected`
Disparado quando o KYC de um usuário é rejeitado.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "user.kyc.rejected",
  "dados": {
    "usuarioId": "user-123",
    "kycStatus": "REJEITADO",
    "motivo": "Documento inválido",
    "kycDocumentos": [
      {
        "kycDocumentoId": "doc-123",
        "tipo": "RG",
        "status": "REJEITADO",
        "motivo_rejeicao": "Documento expirado"
      }
    ]
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

### Crédito

#### `credit.approved`
Disparado quando um crédito é aprovado.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "credit.approved",
  "dados": {
    "creditoId": "credit-123",
    "usuarioId": "user-123",
    "valorAprovado": 50000.00,
    "prazoMeses": 12,
    "taxaMensal": 0.0099,
    "status": "ATIVO"
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

#### `credit.rejected`
Disparado quando um crédito é rejeitado.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "credit.rejected",
  "dados": {
    "creditoId": "credit-123",
    "usuarioId": "user-123",
    "motivo": "Score insuficiente",
    "status": "REJEITADO"
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

### Obras

#### `work.completed`
Disparado quando uma obra é concluída.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "work.completed",
  "dados": {
    "obraId": "obra-123",
    "creditoId": "credit-123",
    "usuarioId": "user-123",
    "nome": "Reforma Casa",
    "status": "CONCLUIDA",
    "dataConcluso": "2024-05-28T15:30:00Z"
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

### Etapas

#### `stage.approved`
Disparado quando uma etapa é aprovada.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "stage.approved",
  "dados": {
    "etapaId": "etapa-123",
    "obraId": "obra-123",
    "creditoId": "credit-123",
    "usuarioId": "user-123",
    "nome": "Fundação",
    "ordem": 1,
    "percentualObra": 15,
    "valorLiberacao": 7500.00,
    "status": "CONCLUIDA"
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

#### `stage.rejected`
Disparado quando uma etapa é rejeitada.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "stage.rejected",
  "dados": {
    "etapaId": "etapa-123",
    "obraId": "obra-123",
    "creditoId": "credit-123",
    "usuarioId": "user-123",
    "nome": "Fundação",
    "status": "REPROVADA",
    "motivo": "Fotos não correspondem à etapa"
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

### Pagamentos

#### `payment.released`
Disparado quando uma parcela é liberada.

```json
{
  "id": "uuid-único-do-evento",
  "evento": "payment.released",
  "dados": {
    "liberacaoId": "lib-123",
    "creditoId": "credit-123",
    "usuarioId": "user-123",
    "valor": 7500.00,
    "status": "CONCLUIDA",
    "dataLiberacao": "2024-05-28T15:30:00Z"
  },
  "timestamp": "2024-05-28T15:30:00Z"
}
```

## Validação de Assinatura

Todos os payloads de webhook são assinados com HMAC-SHA256 usando o secret do webhook. A assinatura é enviada no header `X-Webhook-Signature`.

### Validar Assinatura em Node.js

```typescript
import crypto from "crypto";

function validateWebhookSignature(
  secret: string,
  payload: string,
  signature: string
): boolean {
  const calculatedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

// No seu endpoint de webhook
app.post("/webhooks/imbobi", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);

  if (!validateWebhookSignature(process.env.WEBHOOK_SECRET, payload, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Processar webhook
  console.log("Evento recebido:", req.body.evento);
  res.status(200).json({ received: true });
});
```

### Validar Assinatura em Python

```python
import hmac
import hashlib
import json

def validate_webhook_signature(secret, payload, signature):
    calculated_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, calculated_signature)

# No seu endpoint Flask
@app.route("/webhooks/imbobi", methods=["POST"])
def handle_webhook():
    signature = request.headers.get("X-Webhook-Signature")
    payload = request.get_data(as_text=True)
    
    if not validate_webhook_signature(os.getenv("WEBHOOK_SECRET"), payload, signature):
        return {"error": "Invalid signature"}, 401
    
    data = request.get_json()
    print(f"Evento recebido: {data['evento']}")
    
    return {"received": True}, 200
```

### Validar Assinatura em Go

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
)

func validateWebhookSignature(secret string, payload []byte, signature string) bool {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payload)
	calculatedSignature := hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(calculatedSignature))
}

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	signature := r.Header.Get("X-Webhook-Signature")
	payload, _ := io.ReadAll(r.Body)

	if !validateWebhookSignature(os.Getenv("WEBHOOK_SECRET"), payload, signature) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Processar webhook
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"received": true}`))
}
```

## Headers HTTP

Cada requisição de webhook inclui os seguintes headers:

```
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-hex>
X-Webhook-ID: <webhook-id>
X-Webhook-Delivery: <evento-uuid>
```

## Retry Logic

Se o servidor responder com um status HTTP diferente de 200-204, o webhook será retentado com backoff exponencial:

- **Tentativa 1**: Imediata
- **Tentativa 2**: 5 minutos depois
- **Tentativa 3**: 30 minutos depois

Após a 3ª falha, o webhook é marcado como falho e pode ser retestado manualmente via admin.

## Testando Webhooks

### Via Dashboard Admin

1. Acesse `/admin/webhooks`
2. Clique em "Testar" no webhook desejado
3. O sistema enviará um evento de teste e mostrará o resultado

### Via cURL

```bash
# Criar um webhook
curl -X POST http://localhost:4000/api/v1/admin/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seu-token-jwt>" \
  -d '{
    "url": "https://seu-servidor.com/webhooks/imbobi",
    "eventos": ["user.signup", "credit.approved", "payment.released"]
  }'

# Resposta inclui o secret (guarde em segurança!)
# {
#   "webhookId": "webhook-123",
#   "url": "https://seu-servidor.com/webhooks/imbobi",
#   "eventos": ["user.signup", "credit.approved", "payment.released"],
#   "ativo": true,
#   "secret": "...32-char-hex-string...",
#   "criadoEm": "2024-05-28T15:30:00Z"
# }

# Testar webhook
curl -X POST http://localhost:4000/api/v1/admin/webhooks/webhook-123/test \
  -H "Authorization: Bearer <seu-token-jwt>"

# Listar webhooks
curl http://localhost:4000/api/v1/admin/webhooks \
  -H "Authorization: Bearer <seu-token-jwt>"

# Ver logs
curl "http://localhost:4000/api/v1/admin/webhooks/webhook-123/logs?limit=50&offset=0" \
  -H "Authorization: Bearer <seu-token-jwt>"

# Deletar webhook
curl -X DELETE http://localhost:4000/api/v1/admin/webhooks/webhook-123 \
  -H "Authorization: Bearer <seu-token-jwt>"
```

## Boas Práticas

### 1. Verificar Assinatura

Sempre valide a assinatura HMAC do webhook antes de processar. Nunca confie apenas no header.

### 2. Idempotência

Use o campo `id` do evento para garantir que webhooks duplicados não são processados duas vezes:

```typescript
const eventId = payload.id;
const isDuplicate = await db.webhookEvent.findUnique({
  where: { eventId }
});

if (isDuplicate) {
  return res.status(200).json({ received: true });
}

// Processar evento
await db.webhookEvent.create({ data: { eventId, ... } });
```

### 3. Responder Rapidamente

Responda com status 200-204 assim que validar a assinatura. Processamentos pesados devem ser feitos em background:

```typescript
app.post("/webhooks/imbobi", async (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);

  if (!validateSignature(secret, payload, signature)) {
    return res.status(401).json({ error: "Invalid" });
  }

  // Responder imediatamente
  res.status(200).json({ received: true });

  // Processar em background
  processWebhookAsync(req.body).catch(err =>
    console.error("Webhook processing failed:", err)
  );
});
```

### 4. Registrar Tudo

Mantenha logs detalhados de todos os webhooks recebidos para debug:

```typescript
await db.webhookLog.create({
  data: {
    eventId: payload.id,
    evento: payload.evento,
    payload: payload,
    status: "received",
    receivedAt: new Date(),
  }
});
```

### 5. Renovar Secrets Periodicamente

A cada 6 meses, considere gerar um novo secret via admin e atualizar sua integração.

## Endpoints da API

### POST `/api/v1/admin/webhooks`
Criar novo webhook

**Request:**
```json
{
  "url": "https://seu-servidor.com/webhooks/imbobi",
  "eventos": ["user.signup", "credit.approved"]
}
```

**Response (201):**
```json
{
  "webhookId": "webhook-123",
  "url": "https://seu-servidor.com/webhooks/imbobi",
  "eventos": ["user.signup", "credit.approved"],
  "ativo": true,
  "secret": "...32-char-hex-string...",
  "criadoEm": "2024-05-28T15:30:00Z"
}
```

### GET `/api/v1/admin/webhooks`
Listar webhooks

**Query params:**
- `ativo` (boolean, opcional): Filtrar por status

### GET `/api/v1/admin/webhooks/:id`
Obter webhook específico

### PATCH `/api/v1/admin/webhooks/:id`
Atualizar webhook

**Request:**
```json
{
  "url": "https://novo-url.com/webhooks",
  "eventos": ["user.signup"]
}
```

### PATCH `/api/v1/admin/webhooks/:id/toggle`
Ativar/desativar webhook

**Request:**
```json
{
  "ativo": false
}
```

### DELETE `/api/v1/admin/webhooks/:id`
Deletar webhook

### POST `/api/v1/admin/webhooks/:id/test`
Enviar evento de teste

### GET `/api/v1/admin/webhooks/:id/logs`
Listar logs de um webhook

**Query params:**
- `evento` (string, opcional): Filtrar por tipo de evento
- `status` (string, opcional): `success`, `failed`, ou `pending`
- `limit` (number, default 50): Quantidade de logs
- `offset` (number, default 0): Paginação

## Exemplos de Implementação

### Express.js

```typescript
import express from "express";
import crypto from "crypto";

const app = express();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

app.post("/webhooks/imbobi", express.json(), (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);

  // Validar assinatura
  const calculatedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(calculatedSignature))) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Responder rapidamente
  res.status(200).json({ received: true });

  // Processar em background
  handleEvent(req.body).catch(console.error);
});

async function handleEvent(event) {
  console.log(`Processando evento: ${event.evento}`);

  switch (event.evento) {
    case "user.signup":
      console.log(`Novo usuário: ${event.dados.email}`);
      break;
    case "credit.approved":
      console.log(`Crédito aprovado: R$ ${event.dados.valorAprovado}`);
      break;
    case "payment.released":
      console.log(`Parcela liberada: R$ ${event.dados.valor}`);
      break;
  }
}

app.listen(3000);
```

### Integração com Webhooks.cool (serviço de teste)

```bash
# Crie uma rota de teste em https://webhooks.cool
# Copie a URL fornecida
# Registre como webhook no imbobi:

curl -X POST http://localhost:4000/api/v1/admin/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "url": "https://webhooks.cool/unique-id",
    "eventos": ["user.signup", "credit.approved"]
  }'

# Agora teste gerando eventos e veja em https://webhooks.cool
```

## Troubleshooting

### Webhook não está sendo entregue

1. Verifique se o webhook está **ativo**
2. Verifique se está inscrito no **evento correto**
3. Verifique os **logs do webhook** no admin
4. Teste a URL manualmente com `curl`
5. Verifique os **logs do servidor** para erros

### Erro "Invalid signature"

1. Verifique que está usando o **secret correto**
2. Certifique-se que está validando o **payload bruto** (não parseado)
3. Verifique se o header `X-Webhook-Signature` está presente
4. Teste com a ferramenta de teste do admin

### Webhook não responde rápido o suficiente

1. Responda **antes** de processar dados pesados
2. Use **filas de processamento** (BullMQ, RabbitMQ, etc.)
3. Considere usar **webhooks assíncronos** que informam o resultado via callback

## Suporte

Para dúvidas ou problemas com webhooks:
- Abra uma issue no GitHub
- Contate o suporte: contato@imbobi.com
- Consulte a documentação de API completa em `/docs/api`
