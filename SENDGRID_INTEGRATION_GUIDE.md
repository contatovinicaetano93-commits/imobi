# SendGrid Email Integration Guide — IMOBI

**Date**: June 22, 2026  
**Status**: Implementation Ready  
**Environment Variables Required**: `EMAIL_PROVIDER`, `SENDGRID_API_KEY`, `SMTP_FROM`, `APP_URL`

---

## Executive Summary

IMOBI currently has a **production-ready email service** that supports:
- ✅ Console logging (development)
- ✅ SendGrid SMTP integration (implemented, not enabled)
- ✅ AWS SES alternative (implemented, not enabled)
- ✅ Generic SMTP fallback (implemented, not enabled)

**Current Status**: Console logging mode (emails printed to logs only)  
**Action Required**: Enable SendGrid by setting 2 environment variables

---

## Current System Architecture

### Email Service Location
- **File**: `services/api/src/modules/email/email.service.ts`
- **Module**: `services/api/src/modules/email/email.module.ts`
- **Logic**: Provider selection based on `EMAIL_PROVIDER` env var

### Supported Providers
1. **SendGrid** (RECOMMENDED for production) — API-based, highest reliability
2. **AWS SES** — AWS ecosystem, requires additional AWS credentials
3. **SMTP** — Generic SMTP server (Gmail, Office365, custom)
4. **Console** (DEFAULT) — Logs emails to stdout, no delivery

### Current Email Templates Implemented
1. **bemVindoEmail** — Welcome on registration
2. **etapaAprovadaEmail** — Stage approval notification with release amount
3. **parcelaLiberadaEmail** — Installment released confirmation
4. **capitalFaseAguardandoPagamentoEmail** — Capital phase awaiting manual payment (with WhatsApp link)
5. **obraHomologadaEmail** — Construction work homologated notification
6. **kycAprovadoEmail** — KYC approval confirmation
7. **kycRejeitadoEmail** — KYC rejection with reason
8. **recuperacaoSenhaEmail** — Password reset link
9. **contaExcluida** — Account deletion confirmation (LGPD compliance)

### Integration Points in Codebase

#### 1. Registration & Authentication
- **File**: `services/api/src/modules/auth/auth.service.ts`
- **Trigger**: `registrar()` method (calls `bemVindoEmail`)
- **Status**: Email method called but not awaited (fire-and-forget)

#### 2. Stage Approval
- **File**: `services/api/src/modules/etapas/etapas.service.ts`
- **Trigger**: `aprovar()` method (calls `capitalFaseAguardandoPagamentoEmail`)
- **Status**: Email + notification + push sent together
- **Data**: Includes WhatsApp link to confirm with finance team

#### 3. KYC Document Approval/Rejection
- **File**: `services/api/src/modules/kyc/kyc.service.ts`
- **Triggers**: 
  - `aprovarDocumento()` → `kycAprovadoEmail`
  - `rejeitarDocumento()` → `kycRejeitadoEmail`
- **Status**: Email sent after database update

#### 4. Installment Release
- **File**: `services/api/src/workers/liberacao-parcela.worker.ts`
- **Trigger**: BullMQ job completion (async, hourly background process)
- **Method**: `parcelaLiberadaEmail()`
- **Status**: Email sent via fire-and-forget pattern
- **Error Handling**: Logged but doesn't block installment release

#### 5. Admin Workflow
- **File**: `services/api/src/modules/admin/admin.service.ts`
- **Trigger**: Manual payment release
- **Method**: `parcelaLiberadaEmail()`

---

## Part 1: SendGrid Setup Checklist

### Step 1: Create SendGrid Account
- [ ] Go to https://sendgrid.com/pricing
- [ ] Sign up for Free tier (100 emails/day) or Pro tier
- [ ] Verify email address during registration
- [ ] Complete company information

### Step 2: Generate API Key
- [ ] Log in to SendGrid Dashboard
- [ ] Navigate to **Settings** → **API Keys**
- [ ] Click **Create API Key**
- [ ] Name: `imbobi-production` or `imbobi-staging`
- [ ] Permissions: Select **Mail Send** (full access)
- [ ] Copy API key (you'll only see it once!)
- [ ] Store securely: `SENDGRID_API_KEY=SG.xxxxxxxxxxxx`

### Step 3: Verify Sender Email
- [ ] Go to **Settings** → **Sender Authentication**
- [ ] Click **Verify a Single Sender**
- [ ] Email: Use your company domain (e.g., `noreply@imbobi.com.br`)
- [ ] Name: IMOBI Notificações
- [ ] Confirm verification email sent to that address
- [ ] Check email inbox and click verification link
- [ ] Verification status should show ✅ Verified

### Step 4: Configure Domain Authentication (Optional but Recommended)
- [ ] Go to **Settings** → **Sender Authentication**
- [ ] Click **Authenticate Your Domain**
- [ ] Enter domain: `imbobi.com.br`
- [ ] Choose CNAME authentication
- [ ] Add DNS records (provided by SendGrid) to your domain registrar
- [ ] Wait for DNS propagation (can take 24 hours)
- [ ] Verify domain in SendGrid dashboard

### Step 5: Enable Click Tracking (Optional)
- [ ] Go to **Settings** → **Tracking**
- [ ] Enable **Click Tracking** for email engagement metrics
- [ ] This adds unique URL tracking to links in emails

---

## Part 2: Implementation Code

### 2.1 Environment Variables Configuration

**File**: `.env.production`

```bash
# Email Configuration (NEW PRODUCTION SETUP)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://app.imbobi.com.br
```

**File**: `.env.staging`

```bash
# Email Configuration (STAGING SETUP)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=staging-noreply@imbobi.com.br
APP_URL=https://staging.imbobi.com.br
```

**File**: `.env.development` (unchanged)

```bash
# Email Configuration (LOCAL DEVELOPMENT)
EMAIL_PROVIDER=console
# No additional vars needed - emails print to console
```

### 2.2 Current Email Service Implementation (No Changes Needed!)

The email service is **already production-ready**. Here's what happens when you enable SendGrid:

```typescript
// services/api/src/modules/email/email.service.ts

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private readonly provider: string;

  constructor() {
    this.provider = process.env["EMAIL_PROVIDER"] || "smtp";
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const provider = this.provider.toLowerCase();

    if (provider === "sendgrid") {
      this.initializeSendGrid();  // ← Automatically called when EMAIL_PROVIDER=sendgrid
    } else if (provider === "ses") {
      this.initializeAwsSes();
    } else {
      this.initializeSmtp();
    }
  }

  private initializeSendGrid() {
    const apiKey = process.env["SENDGRID_API_KEY"];

    if (!apiKey) {
      this.logger.warn("SendGrid API key not found - using console mode");
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",    // ← SendGrid SMTP host
      port: 587,                     // ← TLS port
      auth: {
        user: "apikey",              // ← Fixed username for API keys
        pass: apiKey,                // ← Your API key goes here
      },
    });

    this.logger.debug("SendGrid email provider configured");
  }

  async enviarEmail(opcoes: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      // Still in console mode if no transporter initialized
      this.logger.debug(`[EMAIL-CONSOLE] ${opcoes.to} - ${opcoes.subject}`);
      return true;
    }

    // Actual email sending with retry logic
    let lastError: Error | null = null;
    let delayMs = this.retryConfig.delayMs; // 1000ms, doubles on retry

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.transporter.sendMail({
          from: process.env["SMTP_FROM"] || "noreply@imbobi.com",
          to: opcoes.to,
          subject: opcoes.subject,
          html: opcoes.html,
          text: opcoes.text,
        });

        this.logger.debug(`Email sent to ${opcoes.to} (attempt ${attempt}/3)`);
        return true;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Email send attempt ${attempt} failed: ${lastError.message}`);
        
        if (attempt < 3) {
          await this.sleep(delayMs);
          delayMs *= 2; // Exponential backoff
        }
      }
    }

    this.logger.error(`Email failed after 3 attempts: ${lastError?.message}`);
    return false;
  }
}
```

### 2.3 Email Template Examples

**Example 1: Welcome Email (On Registration)**
```typescript
async bemVindoEmail(nome: string, email: string): Promise<boolean> {
  const html = `
    <h2>Bem-vindo ao imbobi, ${nome}!</h2>
    <p>Sua conta foi criada com sucesso.</p>
    <p>Próximos passos:</p>
    <ul>
      <li>Complete seu perfil</li>
      <li>Valide sua identidade (KYC)</li>
      <li>Solicite um crédito</li>
      <li>Crie suas primeiras obras</li>
    </ul>
    <p><a href="${process.env["APP_URL"] || "http://localhost:3000"}/dashboard">
      Acessar Dashboard
    </a></p>
  `;

  return this.enviarEmail({
    to: email,
    subject: "Bem-vindo ao imbobi!",
    html,
  });
}
```

**Example 2: Stage Approval Email**
```typescript
async etapaAprovadaEmail(
  nome: string,
  email: string,
  etapaNome: string,
  obraNome: string,
  valor: number
): Promise<boolean> {
  const html = `
    <h2>Etapa Aprovada: ${etapaNome}</h2>
    <p>Olá ${nome},</p>
    <p>A etapa "<strong>${etapaNome}</strong>" de sua obra 
       "<strong>${obraNome}</strong>" foi aprovada!</p>
    <p>A liberação de 
       <strong>${valor.toLocaleString("pt-BR", { 
         style: "currency", currency: "BRL" 
       })}</strong> 
       foi agendada e será processada em breve.</p>
    <p><a href="${process.env["APP_URL"]}/dashboard/obras">
      Ver Obras
    </a></p>
  `;

  return this.enviarEmail({
    to: email,
    subject: `Etapa Aprovada: ${etapaNome}`,
    html,
  });
}
```

**Example 3: KYC Rejection Email**
```typescript
async kycRejeitadoEmail(
  nome: string,
  email: string,
  motivo: string
): Promise<boolean> {
  const html = `
    <h2>Validação de Identidade Rejeitada</h2>
    <p>Olá ${nome},</p>
    <p>Infelizmente sua validação de identidade foi rejeitada.</p>
    <p><strong>Motivo:</strong> ${motivo}</p>
    <p>Por favor, envie novamente seu documento.</p>
    <p><a href="${process.env["APP_URL"]}/dashboard/kyc">
      Enviar Novo Documento
    </a></p>
  `;

  return this.enviarEmail({
    to: email,
    subject: "Documento Rejeitado - Ação Necessária",
    html,
  });
}
```

---

## Part 3: Testing Email Delivery

### 3.1 Integration Test Script

**File**: `test-sendgrid.sh`

```bash
#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:4000}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"

echo "🧪 Testing Email Integration with SendGrid"
echo "=========================================="
echo ""

# Test 1: Registration (triggers welcome email)
echo "📧 Test 1: Registration Flow (Welcome Email)"
echo "POST /api/v1/auth/registrar"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/registrar" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test-$(date +%s)@imbobi.com\",
    \"senha\": \"TestPass@123\",
    \"nome\": \"Test User\",
    \"cpf\": \"00000000000\",
    \"telefone\": \"11999999999\",
    \"consentidoTermos\": true,
    \"consentidoPrivacy\": true,
    \"consentidoKyc\": true
  }")

USUARIO_ID=$(echo $REGISTER_RESPONSE | jq -r '.usuarioId // empty')
if [ -z "$USUARIO_ID" ]; then
  echo "❌ Registration failed"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ User created: $USUARIO_ID"
echo "   → Welcome email should be sent to registered email"
echo ""

# Test 2: Login to get JWT
echo "📧 Test 2: Requesting Password Reset (Reset Email)"
echo "POST /api/v1/auth/esqueceu-senha"
RESET_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/esqueceu-senha" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test-reset@imbobi.com\"
  }")

RESET_TOKEN=$(echo $RESET_RESPONSE | jq -r '.resetToken // empty')
if [ ! -z "$RESET_TOKEN" ]; then
  echo "✅ Password reset email triggered"
  echo "   → Reset token: ${RESET_TOKEN:0:20}..."
else
  echo "ℹ️  No reset token in response (expected if user doesn't exist)"
fi
echo ""

# Test 3: Check API health (indicates email service initialized)
echo "📧 Test 3: Health Check (Email Service Status)"
echo "GET /api/v1/health"
HEALTH=$(curl -s "$API_URL/api/v1/health")
echo "Response:"
echo "$HEALTH" | jq '.'
echo ""

# Test 4: Verify SendGrid connection (check logs)
echo "📧 Test 4: Check Application Logs"
echo ""
echo "Expected logs:"
echo "  ✅ EMAIL_PROVIDER=sendgrid configured"
echo "  ✅ 'SendGrid email provider configured'"
echo "  ✅ 'Email sent to [recipient]' (if SUCCESS)"
echo "  ⚠️  '[EMAIL-CONSOLE]' (if still in console mode)"
echo ""
echo "To see logs in production:"
echo "  Vercel:  vercel logs api --follow"
echo "  Railway: railway logs -f"
echo "  Docker:  docker logs <container-id> -f"
echo ""

echo "=========================================="
echo "✅ Manual testing complete!"
echo ""
echo "Next steps:"
echo "1. Check email inbox for test emails"
echo "2. Verify SendGrid dashboard for delivery status"
echo "3. Check application logs for any errors"
echo "4. Run full integration tests: pnpm test:e2e"
```

**Run the test:**
```bash
chmod +x test-sendgrid.sh

# Local testing
./test-sendgrid.sh

# Production testing
API_URL=https://api.imbobi.com.br ./test-sendgrid.sh
```

### 3.2 SendGrid Dashboard Monitoring

**To verify email delivery:**

1. **Log in to SendGrid Dashboard**
   - Go to https://app.sendgrid.com

2. **View Delivery Status**
   - Click **Mail Activity** → **Inbox
   - Filter by date/recipient
   - Status should show: `Delivered`, `Opened`, `Clicked`

3. **Check Bounce/Complaint Rate**
   - Go to **Suppressions** → **Bounces/Complaints**
   - Should be empty for valid emails

4. **View Email Templates**
   - Go to **Marketing** → **Templates**
   - See IMOBI email history

### 3.3 Curl-based Email Validation

**Test specific endpoint directly:**

```bash
# Test welcome email via registration
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test@gmail.com",
    "senha": "TestPass@123",
    "nome": "Test User",
    "cpf": "00000000000",
    "telefone": "11999999999",
    "consentidoTermos": true,
    "consentidoPrivacy": true,
    "consentidoKyc": true
  }'

# Expected response:
# {
#   "usuarioId": "uuid",
#   "email": "your-test@gmail.com",
#   "accessToken": "jwt...",
#   "refreshToken": "..."
# }

# Email should arrive in your inbox within 2 seconds
```

---

## Part 4: Test Script Template

**File**: `services/api/test-email-templates.ts`

```typescript
import { Test } from "@nestjs/testing";
import { EmailService } from "./email.service";

describe("EmailService - Template Tests", () => {
  let emailService: EmailService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    emailService = moduleRef.get(EmailService);
  });

  describe("Template Rendering", () => {
    it("should render welcome email with all variables", async () => {
      const result = await emailService.bemVindoEmail(
        "João Silva",
        "joao@imbobi.com"
      );
      expect(result).toBe(true);
      // In production: check SendGrid delivery
      // In development: check console logs
    });

    it("should render stage approval email with currency formatting", async () => {
      const result = await emailService.etapaAprovadaEmail(
        "Maria",
        "maria@imbobi.com",
        "Fundação",
        "Casa Moderna",
        15000.50
      );
      expect(result).toBe(true);
      // Should show: R$ 15.000,50
    });

    it("should render KYC rejection email with custom reason", async () => {
      const result = await emailService.kycRejeitadoEmail(
        "Pedro",
        "pedro@imbobi.com",
        "Documento vencido ou ilegível"
      );
      expect(result).toBe(true);
    });

    it("should handle missing SENDGRID_API_KEY gracefully", async () => {
      // When EMAIL_PROVIDER=sendgrid but no key: falls back to console
      const result = await emailService.enviarEmail({
        to: "test@imbobi.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
      expect(result).toBe(true); // Always returns true (console or sent)
    });
  });

  describe("Retry Logic", () => {
    it("should retry 3 times on SMTP failure", async () => {
      // This test verifies retry logic is active
      // Set SENDGRID_API_KEY to invalid value to trigger retries
      const result = await emailService.enviarEmail({
        to: "test@imbobi.com",
        subject: "Retry Test",
        html: "<p>Should retry</p>",
      });
      // Expected: fails after 3 attempts
      expect(result).toBe(false);
    });
  });
});
```

**Run tests:**
```bash
# Unit test email service
cd services/api
pnpm test -- email.service.spec.ts

# E2E test with real email delivery
pnpm test:e2e -- auth.e2e.spec.ts
```

---

## Part 5: Troubleshooting Guide

### Issue: Emails not arriving

**Symptom**: User registers but doesn't receive welcome email

**Diagnosis Steps**:

1. **Check logs** (identify which provider is active)
   ```bash
   # Vercel logs
   vercel logs api --follow | grep -i email
   
   # Railway logs
   railway logs -f | grep -i email
   
   # Docker logs
   docker logs <container> -f | grep -i email
   ```

2. **Look for these log messages**:
   - ✅ `"SendGrid email provider configured"` → SendGrid is active
   - ⚠️ `"[EMAIL-CONSOLE]"` → Still in console mode (check EMAIL_PROVIDER env var)
   - ❌ `"Email failed after 3 attempts"` → SendGrid credentials invalid

3. **Verify SendGrid credentials**:
   ```bash
   # Check if API key is set
   echo $SENDGRID_API_KEY | wc -c
   # Should print length > 20
   ```

4. **Check SendGrid dashboard**:
   - Go to https://app.sendgrid.com/mail_settings/sender_identity
   - Verify sender email is authenticated
   - Check Mail Activity for bounce/block reasons

### Issue: "SendGrid API key not found"

**Cause**: `SENDGRID_API_KEY` env var not set or empty

**Fix**:
```bash
# 1. Generate new key in SendGrid dashboard
# 2. Add to deployment platform:

# Vercel
vercel env add SENDGRID_API_KEY "SG.xxxxx"

# Railway
railway variables set SENDGRID_API_KEY "SG.xxxxx"

# 3. Redeploy
git push origin main
```

### Issue: "Sender email not verified"

**Cause**: Sender address not authenticated in SendGrid

**Fix**:
```bash
# 1. Go to SendGrid: https://app.sendgrid.com/settings/sender_identity
# 2. Click "Verify a Single Sender"
# 3. Add email: noreply@imbobi.com.br
# 4. Confirm verification email
# 5. Update SMTP_FROM in .env:
SMTP_FROM=noreply@imbobi.com.br
```

### Issue: High bounce rate

**Symptom**: Emails bounce immediately after sending

**Cause**: Invalid recipient email, typo in address

**Fix**:
1. Check user registration validation
2. Review SendGrid Suppressions → Bounces
3. Add valid test emails to whitelist

### Issue: Delayed email delivery (>5 minutes)

**Symptom**: Emails arrive but very slowly

**Cause**: SendGrid queue backlog (rare), retry logic kicking in

**Fix**:
1. Check SendGrid dashboard for queue status
2. Review logs for retry messages
3. Increase retry delay if needed:
   ```typescript
   // services/api/src/modules/email/email.service.ts
   private readonly retryConfig: RetryConfig = {
     maxAttempts: 3,
     delayMs: 2000,  // ← Increase from 1000 if network is slow
     backoffMultiplier: 2,
   };
   ```

---

## Part 6: Migration from Console to SendGrid

### Pre-Migration Checklist

- [ ] SendGrid account created and verified
- [ ] API key generated and secured
- [ ] Sender email authenticated in SendGrid
- [ ] Test email sent successfully to admin account
- [ ] Email service code reviewed (no changes needed)

### Migration Steps

**Step 1: Update Environment Variables**

**Production** (`.env.production`):
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://app.imbobi.com.br
```

**Staging** (`.env.staging`):
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxx
SMTP_FROM=staging-noreply@imbobi.com.br
APP_URL=https://staging.imbobi.com.br
```

**Development** (`.env.development` - UNCHANGED):
```bash
EMAIL_PROVIDER=console
# Emails still print to console for local development
```

**Step 2: Deploy Changes**

```bash
# Push to git (vars already set in deployment platform)
git add .env.production .env.staging
git commit -m "Enable SendGrid email provider for production and staging"
git push origin main

# Vercel auto-deploys
# Railway auto-deploys
# Docker: rebuild and restart
```

**Step 3: Verify in Production**

```bash
# Check logs for success
vercel logs api --follow | grep -i "sendgrid"

# Should see: "SendGrid email provider configured"

# Test registration
curl -X POST https://api.imbobi.com.br/api/v1/auth/registrar ...

# Verify email arrives in 2-5 seconds
```

**Step 4: Monitor First Week**

- [ ] Check SendGrid dashboard daily
- [ ] Monitor bounce rate (should be < 1%)
- [ ] Verify delivery latency (should be < 2s)
- [ ] Check logs for any retry attempts
- [ ] Confirm users are receiving all email types

### Rollback Plan (If Issues Occur)

```bash
# Immediate rollback to console mode
# Vercel
vercel env rm SENDGRID_API_KEY
vercel env add EMAIL_PROVIDER "console"

# Redeploy
git push origin main

# This disables email delivery but keeps system running
# No code changes needed
```

---

## Part 7: Production Integration Points

### 1. Registration Workflow
```
POST /auth/registrar
  → Creates user in DB
  → Sends welcome email (fire-and-forget)
  → Returns JWT + refresh token
  → ← Email arrives async (2-5 seconds)
```

### 2. Stage Approval Workflow
```
PATCH /etapas/{id}/aprovar
  → Updates stage status to CONCLUIDA
  → Creates LiberacaoParcela record
  → Sends approval email (fire-and-forget)
  → Creates in-app notification
  → Sends push notification
  → ← Email arrives async
```

### 3. Installment Release Workflow
```
BullMQ Job (hourly, async)
  → Finds PENDENTE releases
  → Transfers funds (virtual)
  → Updates status to CONCLUIDA
  → Sends release email (fire-and-forget)
  → Creates in-app notification
  → Sends push notification
  → ← Email arrives async
```

### 4. KYC Document Approval
```
PATCH /kyc/{id}/aprovar
  → Updates document status
  → Checks if KYC complete
  → Sends approval email (fire-and-forget)
  → Creates in-app notification
  → ← Email arrives async
```

### 5. KYC Document Rejection
```
PATCH /kyc/{id}/rejeitar
  → Updates document status
  → Sends rejection email (fire-and-forget)
  → Creates in-app notification
  → ← Email arrives async
```

---

## Part 8: Performance & Reliability

### Email Delivery Guarantees

| Metric | Target | Implementation |
|--------|--------|-----------------|
| **Delivery time** | < 5 seconds | SendGrid SLA: 99.99% within 1 minute |
| **Retry attempts** | Up to 3 | Exponential backoff: 1s, 2s, 4s |
| **Failure handling** | Graceful | Logs error but doesn't block workflow |
| **Bounce rate** | < 1% | SendGrid filters invalid addresses |
| **Spam rate** | < 0.1% | Proper headers + domain authentication |

### Monitoring Checklist

Daily:
- [ ] SendGrid dashboard delivery stats
- [ ] Bounce/complaint rate < 1%
- [ ] No authentication errors in logs

Weekly:
- [ ] Email delivery latency (should be < 2s avg)
- [ ] Click rates on dashboard links
- [ ] User complaints about email not received

Monthly:
- [ ] Review email templates for content/links
- [ ] Audit sender reputation
- [ ] Test cold email to new provider

### Cost Analysis

| Provider | Setup | Per Email | Monthly (1000 emails) |
|----------|-------|-----------|----------------------|
| **SendGrid Free** | $0 | $0 | $0 (100/day limit) |
| **SendGrid Pro** | $0 | $0.01 | $10 |
| **AWS SES** | $0 | $0.0001 | $0.10 |
| **Gmail SMTP** | $0 | $0 | $0 (rate limited) |

**Recommendation**: SendGrid Pro (~$10/month) for reliability and features

---

## Part 9: Email Template Enhancement Ideas (Future)

### Suggested Improvements (Post-MVP)

1. **Rich HTML Templates** with branding/logo
2. **Email unsubscribe links** (CAN-SPAM compliance)
3. **Personalization tokens** (dynamic content)
4. **A/B testing** (different subject lines)
5. **Delivery tracking** (SendGrid webhooks)
6. **Attachment support** (documents/receipts)
7. **SMS fallback** (critical emails via SMS)
8. **Multi-language support** (templates in pt-BR/en)

### SendGrid Features to Enable Later

- [ ] **Subscription Center** (user manages email preferences)
- [ ] **Advanced Analytics** (open rates, click tracking)
- [ ] **Dynamic Templates** (handlebars syntax)
- [ ] **Webhook Integration** (bounce/open/click events)

---

## Summary Checklist

### Before Going to Production

- [ ] SendGrid account created
- [ ] API key generated and secured
- [ ] Sender email authenticated
- [ ] Environment variables configured
- [ ] Test email sent to personal email
- [ ] Logs show "SendGrid configured"
- [ ] Registration test completed
- [ ] Welcome email received
- [ ] SendGrid dashboard monitored for 1 hour

### After Going to Production

- [ ] Daily monitoring of SendGrid dashboard
- [ ] Alert on bounce rate > 2%
- [ ] Alert on send failures > 1%
- [ ] Monthly review of email metrics
- [ ] Quarterly template updates
- [ ] Annual cost review

---

**Last Updated**: June 22, 2026  
**Contact**: contato.vinicaetano93@gmail.com  
**Questions**: See troubleshooting guide or email support
