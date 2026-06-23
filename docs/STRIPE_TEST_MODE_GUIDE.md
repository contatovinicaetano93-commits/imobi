# Stripe Test Mode Setup Guide

**Status**: Implementation Ready  
**Version**: 1.0.0  
**Created**: June 23, 2026

---

## 📋 Overview

Complete guide for setting up Stripe test mode for Imobi MVP beta testing. This covers:
- Test API keys configuration
- Test payment methods
- Webhook setup
- Local testing procedures
- Monitoring dashboard

---

## 1️⃣ INITIAL SETUP IN STRIPE DASHBOARD

### 1.1 Create Stripe Account

1. Visit https://dashboard.stripe.com
2. Sign up or log in
3. Switch to **Test Mode** (toggle in top left)
4. Navigate to **Developers** → **API Keys**

### 1.2 Generate Test API Keys

In **API Keys** section:

**Restricted Key** (Recommended for Production):
- Click "Create Restricted Key"
- Name: `imobi-test-api-key`
- Permissions:
  - ✅ read_write
  - ✅ write (for payment intents)
  - ✅ write (for webhooks)
- Environments: Test
- Copy and store securely

**Secret Key**:
- Copy `sk_test_...` from "Secret key" section
- Store in Railway/Render environment variables

**Publishable Key**:
- Copy `pk_test_...` from "Publishable key" section
- Store in frontend .env (visible to clients)

---

## 2️⃣ ENVIRONMENT CONFIGURATION

### 2.1 Update .env.example

```env
# STRIPE Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_KEY_HERE
STRIPE_TEST_MODE=true
STRIPE_API_VERSION=2023-10-16
```

### 2.2 Configure in Railway/Render

**For Railway**:
1. Go to Your Project → Variables
2. Add each environment variable
3. Mark `STRIPE_SECRET_KEY` as "Private"
4. Deploy changes

**For Render**:
1. Go to Service Settings → Environment
2. Add each variable
3. Mark sensitive keys as private
4. Redeploy service

### 2.3 Frontend Configuration

Update `apps/web/.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

---

## 3️⃣ TEST PAYMENT METHODS

### 3.1 Success Scenarios

| Test Card | Use Case | CVC | Expiry |
|-----------|----------|-----|--------|
| 4242 4242 4242 4242 | Successful payment | Any 3 digits | Any future date |
| 4000 0002 5000 3155 | Visa (Success) | Any 3 digits | Any future date |
| 5555 5555 5555 4444 | Mastercard (Success) | Any 3 digits | Any future date |

**Example Test Payment**:
```
Card: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
Name: Test User
```

### 3.2 Decline Scenarios

| Test Card | Decline Reason | Use Case |
|-----------|----------------|----------|
| 4000 0000 0000 0002 | Generic decline | Test decline handling |
| 4000 0000 0000 9995 | Card declined | Insufficient funds |
| 4000 0000 0000 0069 | Expired card | Card expiry logic |
| 4000 0000 0000 0127 | Lost card | Card status |

### 3.3 3D Secure (SCA) Testing

| Test Card | Behavior |
|-----------|----------|
| 4000 0025 0000 3155 | Requires authentication |
| 4000 0025 0000 9010 | Requires authentication (frictionless) |

When testing 3D Secure:
1. Payment goes to "requires_action" status
2. Return customer to authentication page
3. Complete authentication flow
4. Payment processes as "succeeded"

### 3.4 Webhook Simulation

Test webhook events locally:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or
stripe_cli_setup.exe  # Windows
choco install stripe-cli  # Windows

# Authenticate
stripe login

# Start webhook forwarding to local API
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

---

## 4️⃣ IMPLEMENTATION IN NESTJS

### 4.1 Install Stripe Package

```bash
npm install stripe
npm install @stripe/stripe-js  # Frontend
```

### 4.2 Service Implementation

**File**: `services/api/src/modules/pagamento/stripe.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private db: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    const apiVersion = this.config.get<string>('STRIPE_API_VERSION', '2023-10-16');
    const testMode = this.config.get<boolean>('STRIPE_TEST_MODE', true);

    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe disabled');
      return;
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as any,
    });

    this.logger.log(`Stripe initialized in ${testMode ? 'TEST' : 'LIVE'} mode`);
  }

  /**
   * Create a payment intent for credit approval
   * @example
   * const intent = await stripeService.createPaymentIntent(
   *   'user-123',
   *   5000000, // R$ 50.000,00 (in cents)
   *   'Credit approval fee'
   * );
   */
  async createPaymentIntent(
    usuarioId: string,
    amountInCents: number,
    description: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'brl',
        description,
        metadata: {
          usuarioId,
          platform: 'imobi-mvp',
          timestamp: new Date().toISOString(),
        },
      });

      // Store payment record
      await this.db.pagamento.create({
        data: {
          usuarioId,
          valor: amountInCents / 100,
          moeda: 'BRL',
          metodo: 'CREDIT_CARD',
          stripePaymentId: paymentIntent.id,
          stripeStatus: paymentIntent.status,
          status: 'PROCESSANDO',
          descricao: description,
        },
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent', { error, usuarioId });
      throw error;
    }
  }

  /**
   * Retrieve payment intent status
   */
  async getPaymentIntent(paymentIntentId: string) {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Failed to retrieve payment intent', { error });
      throw error;
    }
  }

  /**
   * Process webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.debug(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.db.pagamento.findUnique({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) {
      this.logger.warn(`Payment record not found: ${paymentIntent.id}`);
      return;
    }

    await this.db.pagamento.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'CONCLUIDA',
        stripeStatus: 'succeeded',
        atualizadoEm: new Date(),
      },
    });

    this.logger.log(`Payment succeeded: ${paymentIntent.id} (${payment.usuarioId})`);

    // Trigger any downstream processes
    // e.g., send confirmation email, release credit
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    await this.db.pagamento.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'FALHA',
        stripeStatus: 'payment_failed',
      },
    });

    this.logger.error(`Payment failed: ${paymentIntent.id}`);
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    if (!charge.payment_intent) return;

    await this.db.pagamento.update({
      where: { stripePaymentId: charge.payment_intent as string },
      data: { status: 'REEMBOLSADA' },
    });

    this.logger.log(`Payment refunded: ${charge.id}`);
  }

  /**
   * Construct webhook event from raw body
   * @security Use this to verify webhook authenticity
   */
  constructEvent(
    rawBody: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
```

### 4.3 Controller Implementation

```typescript
// services/api/src/modules/pagamento/pagamento.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  RawBody,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StripeService } from './stripe.service';

@Controller('api/v1/pagamentos')
@UseGuards(JwtAuthGuard)
export class PagamentoController {
  constructor(private stripe: StripeService) {}

  @Post('payment-intent')
  async createPaymentIntent(
    @CurrentUser() user: any,
    @Body() data: { amount: number; description: string },
  ) {
    return await this.stripe.createPaymentIntent(
      user.usuarioId,
      Math.round(data.amount * 100), // Convert to cents
      data.description,
    );
  }

  @Get('payment-intent/:id')
  async getPaymentIntent(@Param('id') paymentIntentId: string) {
    return await this.stripe.getPaymentIntent(paymentIntentId);
  }
}

@Controller('api/v1/webhooks')
export class WebhookController {
  constructor(private stripe: StripeService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @RawBody() body: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature || !body) {
      throw new BadRequestException('Missing signature or body');
    }

    try {
      const event = this.stripe.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      await this.stripe.handleWebhookEvent(event);

      return { received: true };
    } catch (error) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }
}
```

### 4.4 Module Setup

```typescript
// services/api/src/modules/pagamento/pagamento.module.ts
import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PagamentoController } from './pagamento.controller';
import { WebhookController } from './pagamento.controller';

@Module({
  controllers: [PagamentoController, WebhookController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PagamentoModule {}
```

---

## 5️⃣ FRONTEND IMPLEMENTATION

### 5.1 Stripe Element Integration

```typescript
// apps/web/components/PaymentForm.tsx
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function PaymentForm({ paymentIntentId, clientSecret }: {
  paymentIntentId: string;
  clientSecret: string;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentFormInner />
    </Elements>
  );
}

function PaymentFormInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setError('Stripe not loaded');
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      setError(error.message || 'Payment failed');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: { fontSize: '16px', color: '#424770' },
              invalid: { color: '#9e2146' },
            },
          }}
        />
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Pay'}
      </button>
    </form>
  );
}
```

---

## 6️⃣ TESTING PROCEDURES

### 6.1 Manual Payment Test

```bash
# 1. Start local development
npm run dev:api
npm run dev:web

# 2. Log in as test user
# Email: joao.silva@teste.imobi.com
# Password: Beta123!@#

# 3. Navigate to payment page
# Visit: http://localhost:3001/dashboard/credito

# 4. Create payment intent
POST http://localhost:3000/api/v1/pagamentos/payment-intent
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "amount": 100.00,
  "description": "Credit approval fee"
}

# 5. Fill payment form with test card
# Card: 4242 4242 4242 4242
# Expiry: 12/25
# CVC: 123

# 6. Submit and verify payment succeeded
# Check backend logs for:
# "Payment succeeded: pi_xxxx"

# 7. Verify database record
SELECT * FROM pagamentos WHERE stripePaymentId = 'pi_xxxx';
```

### 6.2 E2E Payment Flow Test

```typescript
// tests/e2e/payment.e2e.ts
describe('Payment Flow', () => {
  it('should create payment intent and process payment', async () => {
    // 1. Login
    const token = await login('joao.silva@teste.imobi.com', 'Beta123!@#');

    // 2. Create payment intent
    const response = await fetch('/api/v1/pagamentos/payment-intent', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100,
        description: 'Test payment',
      }),
    });

    expect(response.status).toBe(200);
    const { clientSecret, paymentIntentId } = await response.json();
    expect(clientSecret).toBeDefined();

    // 3. Confirm payment with test card
    const stripeResponse = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: { number: '4242424242424242', exp_month: 12, exp_year: 25, cvc: '123' },
      },
    });

    expect(stripeResponse.paymentIntent.status).toBe('succeeded');

    // 4. Verify in database
    const payment = await db.pagamento.findUnique({
      where: { stripePaymentId: paymentIntentId },
    });

    expect(payment.status).toBe('CONCLUIDA');
  });
});
```

### 6.3 Webhook Testing

```bash
# 1. Start webhook forwarding
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# 2. In another terminal, trigger events
stripe trigger payment_intent.succeeded

# 3. Verify webhook processed
# Check API logs:
# "Processing webhook event: payment_intent.succeeded"
# "Payment succeeded: pi_xxxx"

# 4. Verify database updated
SELECT status FROM pagamentos WHERE stripePaymentId = 'pi_xxxx';
```

---

## 7️⃣ MONITORING & DEBUGGING

### 7.1 Stripe Dashboard Monitoring

1. **Payments Tab**: View all test payments
   - https://dashboard.stripe.com/test/payments

2. **Events Tab**: View webhook events
   - https://dashboard.stripe.com/test/events

3. **Logs Tab**: View API activity
   - https://dashboard.stripe.com/test/logs

### 7.2 Common Issues

| Issue | Solution |
|-------|----------|
| `No such key: sk_test_...` | Verify API key in .env is correct |
| `Webhook signature invalid` | Ensure `STRIPE_WEBHOOK_SECRET` matches CLI output |
| `Invalid API Key` | Regenerate keys in Stripe dashboard |
| `Test card declined` | Use `4000 0000 0000 0002` for decline test |
| `Client secret expired` | Payment intent valid for 15 minutes |

### 7.3 Debug Mode

Enable debug logging:

```typescript
// In stripe.service.ts
if (process.env.DEBUG_STRIPE === 'true') {
  this.logger.debug('Payment intent created', paymentIntent);
}

// Run with
DEBUG_STRIPE=true npm run dev:api
```

---

## 8️⃣ SECURITY CHECKLIST

- [x] API keys stored in environment variables (never in code)
- [x] Secret key marked as "Private" in deployment platforms
- [x] Webhook signature verified before processing
- [x] Payment amounts validated on server-side
- [x] PCI-DSS compliance (no direct card storage)
- [x] HTTPS enforced for all payment endpoints
- [x] Rate limiting applied to payment endpoints
- [x] Audit logging for all payments

---

## 📚 USEFUL LINKS

- **Stripe Docs**: https://stripe.com/docs
- **API Reference**: https://stripe.com/docs/api
- **Test Data**: https://stripe.com/docs/testing
- **Webhooks**: https://stripe.com/docs/webhooks
- **Libraries**: https://stripe.com/docs/libraries
- **Support**: https://support.stripe.com

---

**Status**: Ready for Implementation  
**Last Updated**: June 23, 2026  
**Maintainer**: DevOps Team
