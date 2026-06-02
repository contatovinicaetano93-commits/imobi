# AWS SES Configuration Guide

## Overview
The email service supports AWS SES as the primary transport with automatic fallback to SMTP for local development.

## Environment Configuration

### Option 1: AWS SES (Production)
```env
USE_AWS_SES=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SES_FROM_EMAIL=noreply@imbobi.com
```

### Option 2: SMTP (Local Development)
```env
USE_AWS_SES=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@imbobi.com
```

## AWS SES Setup Steps

1. **Create AWS IAM User**
   - Sign in to AWS Console
   - Go to IAM → Users → Create user
   - Attach policy: `AmazonSesFull`

2. **Verify Email Identity**
   - Go to AWS SES Console
   - Select region (AWS_REGION)
   - Go to "Verified Identities"
   - Add email: `noreply@imbobi.com`
   - Verify via confirmation link

3. **Request Production Access** (if in sandbox)
   - Go to SES Account Dashboard
   - Click "Request Production Access"
   - Complete verification

## Testing Connection

```bash
curl -X GET http://localhost:4000/health
```

## Email Types

- Welcome, Approval, Disbursement, KYC, Password Reset, Account Deletion

## Monitoring

Check logs for:
```
[EmailService] Email provider: AWS SES (us-east-1)
[EmailService] Email sent via SES to user@example.com (MessageId: ...)
```

## Pricing
- First 62,000 emails/month: Free
- Beyond: $0.10 per 1,000 emails
