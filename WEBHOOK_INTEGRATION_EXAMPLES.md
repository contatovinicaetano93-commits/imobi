# Exemplos de Integração de Webhooks

Este documento mostra como integrar os eventos de webhook nos serviços existentes do imbobi.

## Estrutura

O sistema de webhooks foi configurado com:
- **Serviço**: `WebhookService` — gerencia webhooks e dispara eventos
- **Processador**: `WebhookProcessor` — processa jobs de webhook com retry
- **Helpers**: `WebhookEvents` — métodos para disparar eventos específicos
- **Módulo**: `WebhookModule` — importado no `AppModule`

## Integração no Módulo de Usuários

### 1. Importar WebhookEvents

```typescript
// usuarios.service.ts
import { Module } from "@nestjs/common";
import { UsuariosService } from "./usuarios.service";
import { UsuariosController } from "./usuarios.controller";
import { WebhookModule } from "../webhook/webhook.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, WebhookModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
```

### 2. Disparar evento ao criar usuário

```typescript
// usuarios.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookEvents } from "../webhook/webhook-events";

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEvents: WebhookEvents,
  ) {}

  async createUsuario(data: CreateUsuarioDto) {
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        cpf: data.cpf,
        // ... outros campos
      },
    });

    // Disparar evento de webhook
    try {
      await this.webhookEvents.onUserSignup(
        usuario.usuarioId,
        usuario.nome,
        usuario.email,
        usuario.tipo
      );
    } catch (error) {
      // Webhook falha não devem impedir a criação do usuário
      console.error("Erro ao disparar webhook:", error);
    }

    return usuario;
  }
}
```

## Integração no Módulo de KYC

```typescript
// kyc.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookEvents } from "../webhook/webhook-events";

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEvents: WebhookEvents,
  ) {}

  async approveKyc(usuarioId: string) {
    const usuario = await this.prisma.usuario.update({
      where: { usuarioId },
      data: { kycStatus: "APROVADO" },
      include: { kycDocumentos: true },
    });

    // Disparar evento
    try {
      await this.webhookEvents.onKycApproved(
        usuarioId,
        usuario.kycDocumentos.map(doc => ({
          kycDocumentoId: doc.kycDocumentoId,
          tipo: doc.tipo,
          status: doc.status,
        }))
      );
    } catch (error) {
      console.error("Erro ao disparar webhook KYC aprovado:", error);
    }

    return usuario;
  }

  async rejectKyc(usuarioId: string, motivo: string) {
    const usuario = await this.prisma.usuario.update({
      where: { usuarioId },
      data: { kycStatus: "REJEITADO" },
      include: { kycDocumentos: true },
    });

    // Disparar evento
    try {
      await this.webhookEvents.onKycRejected(
        usuarioId,
        motivo,
        usuario.kycDocumentos.map(doc => ({
          kycDocumentoId: doc.kycDocumentoId,
          tipo: doc.tipo,
          status: doc.status,
          motivo_rejeicao: doc.motivo_rejeicao,
        }))
      );
    } catch (error) {
      console.error("Erro ao disparar webhook KYC rejeitado:", error);
    }

    return usuario;
  }
}
```

## Integração no Módulo de Crédito

```typescript
// credito.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookEvents } from "../webhook/webhook-events";

@Injectable()
export class CreditoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEvents: WebhookEvents,
  ) {}

  async approveCredit(creditoId: string, valorAprovado: number, prazoMeses: number, taxaMensal: number) {
    const credito = await this.prisma.credito.update({
      where: { creditoId },
      data: {
        valorAprovado,
        prazoMeses,
        taxaMensal,
        status: "ATIVO",
      },
      include: { usuario: true },
    });

    // Disparar evento
    try {
      await this.webhookEvents.onCreditApproved(
        creditoId,
        credito.usuarioId,
        valorAprovado,
        prazoMeses,
        taxaMensal
      );
    } catch (error) {
      console.error("Erro ao disparar webhook credit approved:", error);
    }

    return credito;
  }

  async rejectCredit(creditoId: string, motivo: string) {
    const credito = await this.prisma.credito.findUnique({
      where: { creditoId },
      include: { usuario: true },
    });

    if (!credito) throw new Error("Crédito não encontrado");

    // Disparar evento
    try {
      await this.webhookEvents.onCreditRejected(
        creditoId,
        credito.usuarioId,
        motivo
      );
    } catch (error) {
      console.error("Erro ao disparar webhook credit rejected:", error);
    }
  }
}
```

## Integração no Módulo de Etapas

```typescript
// etapas.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookEvents } from "../webhook/webhook-events";

@Injectable()
export class EtapasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEvents: WebhookEvents,
  ) {}

  async approveStage(etapaId: string) {
    const etapa = await this.prisma.etapaObra.update({
      where: { etapaId },
      data: { status: "CONCLUIDA" },
      include: { obra: true },
    });

    // Disparar evento
    try {
      await this.webhookEvents.onStageApproved(
        etapaId,
        etapa.obraId,
        etapa.obra.creditoId,
        etapa.obra.usuarioId,
        {
          nome: etapa.nome,
          ordem: etapa.ordem,
          percentualObra: etapa.percentualObra,
          valorLiberacao: etapa.valorLiberacao,
        }
      );
    } catch (error) {
      console.error("Erro ao disparar webhook stage approved:", error);
    }

    return etapa;
  }

  async rejectStage(etapaId: string, motivo: string) {
    const etapa = await this.prisma.etapaObra.update({
      where: { etapaId },
      data: { status: "REPROVADA" },
      include: { obra: true },
    });

    // Disparar evento
    try {
      await this.webhookEvents.onStageRejected(
        etapaId,
        etapa.obraId,
        etapa.obra.creditoId,
        etapa.obra.usuarioId,
        {
          nome: etapa.nome,
        },
        motivo
      );
    } catch (error) {
      console.error("Erro ao disparar webhook stage rejected:", error);
    }

    return etapa;
  }
}
```

## Integração no Worker de Liberação de Parcela

```typescript
// liberacao-parcela.worker.ts
import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaService } from "../modules/prisma/prisma.service";
import { WebhookEvents } from "../modules/webhook/webhook-events";

export const QUEUE_LIBERACAO = "liberacao-parcela";

@Injectable()
@Processor(QUEUE_LIBERACAO)
export class LiberacaoParcelaWorker {
  private readonly logger = new Logger(LiberacaoParcelaWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject("WebhookEvents") private readonly webhookEvents: WebhookEvents,
  ) {}

  @Process()
  async handle(job: Job<{ creditoId: string; valor: number }>) {
    const { creditoId, valor } = job.data;

    try {
      // ... processar liberação

      // Obter ID da liberação criada
      const liberacao = await this.prisma.liberacaoParcela.findFirst({
        where: { creditoId, status: "CONCLUIDA" },
        orderBy: { criadoEm: "desc" },
      });

      if (liberacao) {
        // Disparar evento de webhook
        try {
          await this.webhookEvents.onPaymentReleased(
            liberacao.liberacaoId,
            creditoId,
            credito.usuarioId,
            valor
          );
        } catch (error) {
          this.logger.error("Erro ao disparar webhook payment released:", error);
        }
      }
    } catch (error) {
      this.logger.error(`Erro ao processar liberação: ${error}`);
      throw error;
    }
  }
}
```

## Integração no Módulo de Obras

```typescript
// obras.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WebhookEvents } from "../webhook/webhook-events";

@Injectable()
export class ObrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEvents: WebhookEvents,
  ) {}

  async completeWork(obraId: string) {
    const obra = await this.prisma.obra.update({
      where: { obraId },
      data: { status: "CONCLUIDA" },
    });

    // Disparar evento
    try {
      await this.webhookEvents.onWorkCompleted(
        obraId,
        obra.creditoId,
        obra.usuarioId,
        obra.nome
      );
    } catch (error) {
      console.error("Erro ao disparar webhook work completed:", error);
    }

    return obra;
  }
}
```

## Padrão de Tratamento de Erros

Sempre use try-catch ao disparar eventos de webhook para que falhas não interrompam o fluxo principal:

```typescript
// Padrão recomendado
try {
  await this.webhookEvents.onUserSignup(...);
} catch (error) {
  this.logger.error("Erro ao disparar webhook:", error);
  // Não re-lançar o erro, apenas registrar
}
```

## Testando Webhooks em Desenvolvimento

### 1. Usar Webhooks.cool para testar

```bash
# 1. Visite https://webhooks.cool
# 2. Copie a URL fornecida (ex: https://webhooks.cool/abc123)
# 3. Registre como webhook:

curl -X POST http://localhost:4000/api/v1/admin/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seu-token>" \
  -d '{
    "url": "https://webhooks.cool/seu-id",
    "eventos": ["user.signup", "credit.approved"]
  }'

# 4. Crie um usuário via API
# 5. Veja a requisição em https://webhooks.cool
```

### 2. Usar ngrok para testar localmente

```bash
# 1. Instale ngrok: https://ngrok.com/download
# 2. Inicie seu servidor local na porta 3000
# 3. Exponha com ngrok:

ngrok http 3000

# 4. Copie a URL do ngrok (ex: https://abc123.ngrok.io)
# 5. Registre como webhook:

curl -X POST http://localhost:4000/api/v1/admin/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <seu-token>" \
  -d '{
    "url": "https://abc123.ngrok.io/webhooks/imbobi",
    "eventos": ["user.signup"]
  }'

# 6. Seu servidor local receberá as requisições
```

### 3. Servidor de teste local

```typescript
// test-webhook-server.ts
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = "seu-secret-aqui";

app.post("/webhooks/imbobi", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);

  // Validar assinatura
  const calculatedSig = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (signature !== calculatedSig) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  console.log("Webhook recebido:");
  console.log(JSON.stringify(req.body, null, 2));

  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log("Servidor de webhook escutando em http://localhost:3000");
});
```

## Monitoramento

Os webhooks podem ser monitorados via dashboard admin:

1. Acesse `/admin/webhooks`
2. Veja a lista de webhooks registrados
3. Clique em "Logs" para ver histórico de entrega
4. Clique em "Teste" para enviar um evento de teste
5. Use filtros para buscar por evento ou status

## Boas Práticas de Integração

1. **Sempre verificar assinatura** — nunca confie só no header
2. **Responder rápido** — a integração deve responder em < 30 segundos
3. **Usar idempotência** — trate eventos duplicados corretamente
4. **Registrar tudo** — mantenha logs de eventos recebidos
5. **Não falhar silenciosamente** — notifique sobre erros críticos
6. **Monitorar fila** — verifique se webhooks estão sendo entregues

## Troubleshooting

### Webhooks não estão sendo entregues

1. Verifique se webhook está **ativo** no admin
2. Verifique se está inscrito no **evento correto**
3. Verifique **logs do webhook** no admin — clique "Logs"
4. Teste manualmente — clique "Testar"
5. Verifique se a **URL é acessível** externamente

### Webhook responde com erro

1. Verifique **validação de assinatura**
2. Verifique **logs do servidor** recebedor
3. Teste a URL diretamente com curl:
   ```bash
   curl -X POST https://sua-url.com/webhook \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Signature: seu-hmac-sha256" \
     -d '{"id":"test","evento":"webhook.test"}'
   ```

### Muitas retentativas

1. Webhook está retentando 3x com backoff
2. Verifique se URL está respondendo com 200-204
3. Se erro persistir, desative o webhook

## Próximos Passos

1. Revisar a integração em cada módulo
2. Adicionar testes unitários para disparos de webhook
3. Configurar alertas para falhas de webhook
4. Documentar integração no manual de API
5. Criar dashboard público de status dos webhooks
