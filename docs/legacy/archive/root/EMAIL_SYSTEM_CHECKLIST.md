# Email System Implementation Checklist — IMOBI

**Prepared**: June 22, 2026  
**Status**: Ready for Production Deployment  
**Contact**: contato.vinicaetano93@gmail.com

---

## Quick Start (5 Minutes)

### What You Need to Do
1. ✅ **Create SendGrid Account** → Get API key
2. ✅ **Verify Sender Email** → Confirm noreply@imbobi.com.br
3. ✅ **Update Environment Variables** → Set 2 vars
4. ✅ **Redeploy Application** → Push to main
5. ✅ **Test Email Delivery** → Register test user

### Current Status
- ✅ Email service fully implemented (code complete)
- ✅ All email templates ready (9 templates)
- ✅ Integration points active (Auth, KYC, Etapas, Workers)
- ⏳ **PENDING**: Enable SendGrid credentials

---

## Pre-Implementation: SendGrid Account Setup

### PART 1: Create SendGrid Account

**Duration**: 5 minutes  
**Cost**: Free tier available (100 emails/day) or $10/month for Pro

**Steps**:

- [ ] Go to https://sendgrid.com/pricing
- [ ] Sign up (Free or Pro account)
- [ ] Verify email address
- [ ] Complete registration

**Result**: SendGrid account active

---

### PART 2: Generate API Key

**Duration**: 2 minutes  
**Critical**: Copy key immediately (only shown once)

**Steps**:

- [ ] Log in to https://app.sendgrid.com
- [ ] Go to **Settings** → **API Keys**
- [ ] Click **Create API Key**
  - Name: `imbobi-production` (or staging/development)
  - Permissions: `Mail Send` ✓
- [ ] **Copy and save immediately**: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- [ ] Store in secure password manager
- [ ] **DO NOT commit to Git**

**Result**: API key ready for deployment platform

---

### PART 3: Verify Sender Email

**Duration**: 5 minutes (including email confirmation)  
**Critical**: Email must be verified before sending

**Steps**:

- [ ] Log in to SendGrid
- [ ] Go to **Settings** → **Sender Authentication**
- [ ] Click **Verify a Single Sender**
- [ ] Fill in form:
  - Email: `noreply@imbobi.com.br`
  - Name: `IMOBI Notificações`
  - Address: Your company address
  - City, State, Country: Fill in details
- [ ] Click **Create**
- [ ] **Check email inbox** for verification link
- [ ] **Click verification link** in email
- [ ] Return to SendGrid dashboard
- [ ] Confirm status shows ✅ **Verified**

**Result**: Sender email authenticated

---

### PART 4: Configure Domain (Optional but Recommended)

**Duration**: 15 minutes + 24 hours for DNS propagation  
**Benefit**: Improves deliverability, enables DKIM signing

**Steps**:

- [ ] Log in to SendGrid
- [ ] Go to **Settings** → **Sender Authentication**
- [ ] Click **Authenticate Your Domain**
- [ ] Enter domain: `imbobi.com.br`
- [ ] Choose: **CNAME Authentication**
- [ ] SendGrid provides DNS records
- [ ] Log in to your domain registrar (GoDaddy, Route53, etc.)
- [ ] Add provided CNAME records to DNS
- [ ] Wait up to 24 hours for DNS propagation
- [ ] Return to SendGrid → Verify in dashboard

**Result**: Domain authenticated (optional, but recommended)

**Skip if**: You want to test quickly with verified single sender

---

## Implementation: Environment Variables

### PART 5: Set Environment Variables

**Duration**: 5 minutes  
**Files Modified**: None (env vars only)

#### For Production (Vercel/Railway/Self-Hosted)

**Vercel**:
```bash
# Command line
vercel env add EMAIL_PROVIDER "sendgrid"
vercel env add SENDGRID_API_KEY "SG.xxxxxxxxxxxxxxxxxxxxxxxx"

# OR via Vercel dashboard
# Settings → Environment Variables
# Add:
#   EMAIL_PROVIDER = sendgrid
#   SENDGRID_API_KEY = SG.xxx
```

**Railway**:
```bash
# Command line
railway variables set EMAIL_PROVIDER "sendgrid"
railway variables set SENDGRID_API_KEY "SG.xxxxxxxxxxxxxxxxxxxxxxxx"

# OR via Railway dashboard
# Settings → Variables
```

**AWS/Self-Hosted**:
```bash
# In .env.production file
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=noreply@imbobi.com.br
APP_URL=https://app.imbobi.com.br
```

#### For Staging

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
SMTP_FROM=staging-noreply@imbobi.com.br
APP_URL=https://staging.imbobi.com.br
```

#### For Development (No Changes Needed)

```bash
# Already correct in .env.development
EMAIL_PROVIDER=console
# Emails will print to console (no additional setup needed)
```

**Result**: Environment variables configured for all environments

---

### PART 6: Deploy Application

**Duration**: 2-5 minutes

**Steps**:

```bash
# Push changes to trigger redeploy
git add .env.production .env.staging
git commit -m "Enable SendGrid email provider for production and staging"
git push origin main

# Wait for deployment platform to build and deploy
# Vercel: Automatic (watch Deployments tab)
# Railway: Automatic (watch logs)
# Docker: Manual redeploy with new env vars
```

**Verify Deployment**:

```bash
# Check logs for success message
# Should see: "SendGrid email provider configured"

# Vercel
vercel logs api --follow | grep -i sendgrid

# Railway
railway logs -f | grep -i sendgrid

# Docker
docker logs <container-id> -f | grep -i email
```

**Result**: Application restarted with SendGrid active

---

## Validation: Test Email Delivery

### PART 7: Manual Testing

**Duration**: 5 minutes  
**Method**: Register test user

**Steps**:

```bash
# Run test script (if available)
cd services/api
chmod +x test-email-integration.sh
./test-email-integration.sh production test-email@gmail.com

# OR manual test via curl
curl -X POST https://api.imbobi.com.br/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-personal-email@gmail.com",
    "senha": "TestPass@123",
    "nome": "Test User",
    "cpf": "00000000000",
    "telefone": "11999999999",
    "consentidoTermos": true,
    "consentidoPrivacy": true,
    "consentidoKyc": true
  }'
```

**Check Results**:

- [ ] **Email inbox** → Welcome email arrives within 2-5 seconds
- [ ] **Subject line** → "Bem-vindo ao imbobi!"
- [ ] **Email content** → Personalized with your name
- [ ] **Links work** → Click "Acessar Dashboard" link

**If email doesn't arrive**:

1. Check spam/promotions folder
2. Check SendGrid dashboard: https://app.sendgrid.com/mail_activity
3. Look for bounce/complaint messages
4. Check application logs for errors
5. See troubleshooting section below

**Result**: Email delivery validated

---

### PART 8: SendGrid Dashboard Verification

**Duration**: 2 minutes

**Check these metrics**:

```
URL: https://app.sendgrid.com

1. Mail Activity
   ✓ Click: "Mail Activity"
   ✓ Filter by recipient email
   ✓ Status should show: "Delivered" ✅

2. Bounce Rate
   ✓ Go to: Suppressions → Bounces
   ✓ Should be EMPTY (no bounces)

3. Delivery Stats
   ✓ Go to: Analytics
   ✓ Today's stats should show:
     - Requests: ≥ 1
     - Delivered: ≥ 1
     - Bounce rate: 0%
```

**Result**: Confirm SendGrid is sending emails successfully

---

## Ongoing: Monitoring & Maintenance

### PART 9: Daily Monitoring (5 minutes/day)

**Daily Checklist**:

- [ ] Check SendGrid dashboard for error rate (should be < 1%)
- [ ] Verify bounce rate (should be < 1%)
- [ ] Check application logs for email send errors
- [ ] Monitor email delivery latency (should be < 2 seconds)

**Commands**:

```bash
# Check recent logs
vercel logs api --follow | grep -i email

# Check SendGrid dashboard
open https://app.sendgrid.com/mail_activity
```

**Alert Thresholds**:
- ⚠️ **Warning**: Error rate > 2%
- 🔴 **Critical**: Error rate > 5%

---

### PART 10: Weekly Monitoring (30 minutes/week)

**Weekly Checklist**:

- [ ] Review SendGrid analytics dashboard
- [ ] Check bounce rate trends (should be stable < 1%)
- [ ] Verify spam complaint rate (should be 0%)
- [ ] Test user workflow end-to-end (registration → email)
- [ ] Review failed delivery reasons in SendGrid

**Actions**:

```bash
# Full workflow test
# 1. Register new user
# 2. Wait 5 seconds
# 3. Check inbox for welcome email
# 4. Verify all links work
# 5. Check SendGrid dashboard for status
```

---

### PART 11: Monthly Maintenance (1 hour/month)

**Monthly Checklist**:

- [ ] Review email template content for accuracy
- [ ] Check links still work (APP_URL correct)
- [ ] Verify sender reputation in SendGrid
- [ ] Review bounced email addresses
- [ ] Check SendGrid plan usage (free vs paid)
- [ ] Review cost (should be ~$10-50/month)
- [ ] Test all email template types:
  - Welcome email (registration)
  - Stage approval (obra workflow)
  - KYC approval (identity validation)
  - KYC rejection (requires re-submit)
  - Password reset (security)
  - Payment confirmation (financial)

**Monthly Report Template**:

```
EMAIL SYSTEM MONTHLY REPORT
Date: [Month]

Key Metrics:
- Total emails sent: [N]
- Delivery rate: [%]
- Bounce rate: [%]
- Complaint rate: [%]
- Open rate: [%]
- Click rate: [%]

Cost: [$$]
Incidents: [0 or N]

Status: ✅ HEALTHY or ⚠️ NEEDS ATTENTION
```

---

## Troubleshooting Guide

### Issue: Welcome Email Not Arriving

**Symptom**: User registers but doesn't receive email within 5 seconds

**Diagnosis**:

```bash
# Step 1: Check logs
vercel logs api --follow | grep -i email

# Look for these messages:
# ✅ "SendGrid email provider configured" → Provider active
# ❌ "[EMAIL-CONSOLE]" → Still in console mode
# ❌ "Email failed after 3 attempts" → SendGrid error
```

**Solutions**:

1. **Still in console mode?**
   - Check: `EMAIL_PROVIDER` env var
   - Should be: `sendgrid`
   - Redeploy if changed

2. **SendGrid connection error?**
   - Check: `SENDGRID_API_KEY` env var
   - Verify in SendGrid dashboard it's valid
   - Generate new key if needed

3. **Email in spam folder?**
   - Check spam/promotions inbox
   - Mark as "Not Spam"
   - Improve sender reputation (see below)

4. **Bounce/complaint in SendGrid?**
   - Go to: https://app.sendgrid.com/suppressions
   - Check for bounced addresses
   - May be temporary (retry in 24 hours)

---

### Issue: "SendGrid API Key Not Found"

**Symptom**: Logs show: `"SendGrid API key not found - using console mode"`

**Cause**: `SENDGRID_API_KEY` environment variable not set

**Fix**:

```bash
# Vercel
vercel env add SENDGRID_API_KEY "SG.xxxxxxxxxxxxxxxx"
vercel redeploy

# Railway
railway variables set SENDGRID_API_KEY "SG.xxxxxxxxxxxxxxxx"
railway redeploy

# Docker
docker run -e SENDGRID_API_KEY="SG.xxx" imobi-api:latest
```

---

### Issue: "Sender Email Not Verified"

**Symptom**: Emails fail with auth error

**Cause**: Sender email (noreply@imbobi.com.br) not verified in SendGrid

**Fix**:

1. Go to SendGrid: https://app.sendgrid.com/settings/sender_identity
2. Click: **Verify a Single Sender**
3. Add email: `noreply@imbobi.com.br`
4. Confirm verification link in email
5. Wait for status: ✅ **Verified**

---

### Issue: High Bounce Rate

**Symptom**: SendGrid dashboard shows > 5% bounce rate

**Cause**: Invalid email addresses or typos in registration

**Fix**:

1. Review bounced addresses in SendGrid
2. Identify patterns (domains, patterns)
3. Improve registration validation
4. Contact affected users to correct email

---

### Issue: Delayed Email Delivery (> 5 minutes)

**Symptom**: Emails arrive eventually but very slowly

**Cause**: Queue backlog, network issues, or ISP rate limiting

**Fix**:

1. Check SendGrid queue status (rarely a problem)
2. Verify network connectivity
3. Review application logs for retry messages
4. Increase retry delay if needed (production):
   ```typescript
   // services/api/src/modules/email/email.service.ts
   private readonly retryConfig = {
     delayMs: 2000, // ← Increase from 1000
     maxAttempts: 3,
     backoffMultiplier: 2,
   };
   ```

---

## Post-Implementation: Enhancement Ideas (Future)

### Short Term (Week 1-2)

- [ ] Add email preview in SendGrid templates
- [ ] Setup email webhooks for delivery tracking
- [ ] Add unsubscribe links to emails (CAN-SPAM)
- [ ] Create email analytics dashboard

### Medium Term (Month 1-2)

- [ ] A/B testing different subject lines
- [ ] Personalization tokens in templates
- [ ] Email attachment support (receipts, invoices)
- [ ] Multi-language email support (pt-BR, en)

### Long Term (Month 3+)

- [ ] SMS fallback for critical emails
- [ ] Email preference center (user-managed)
- [ ] Advanced analytics (opens, clicks, conversions)
- [ ] Drip campaigns (educational series)
- [ ] Dynamic template support

---

## Success Criteria

### ✅ System is working correctly when:

- [x] Welcome emails arrive within 5 seconds
- [x] Delivery rate > 98%
- [x] Bounce rate < 1%
- [x] No spam complaints
- [x] All links in emails work
- [x] Users can click through to dashboard
- [x] Application logs show no email errors
- [x] SendGrid dashboard shows "Delivered" status

### 🔴 System needs attention if:

- [ ] Emails arrive > 10 seconds late
- [ ] Delivery rate < 95%
- [ ] Bounce rate > 2%
- [ ] Any spam complaints
- [ ] Links in emails broken
- [ ] Application logs show repeated failures
- [ ] SendGrid shows bounced messages

---

## Deployment Summary

| Step | Duration | Status |
|------|----------|--------|
| 1. Create SendGrid Account | 5 min | ⏳ PENDING |
| 2. Generate API Key | 2 min | ⏳ PENDING |
| 3. Verify Sender Email | 5 min | ⏳ PENDING |
| 4. Configure Domain (optional) | 15 min + 24h | ⏳ PENDING |
| 5. Set Environment Variables | 5 min | ⏳ PENDING |
| 6. Deploy Application | 5 min | ⏳ PENDING |
| 7. Test Email Delivery | 5 min | ⏳ PENDING |
| 8. Verify SendGrid Dashboard | 2 min | ⏳ PENDING |
| 9. Daily Monitoring Setup | 5 min | ⏳ PENDING |
| **Total Time** | **~45 minutes + 24h DNS** | |

---

## Rollback Plan (If Issues Occur)

**If anything goes wrong**, you can instantly disable email sending:

```bash
# Revert to console mode (no actual email sending)
vercel env add EMAIL_PROVIDER "console"
vercel redeploy

# Now:
# - Emails will print to logs only
# - System continues to function normally
# - No user-facing impact
# - Time to fix: unlimited
```

---

## References

- **SendGrid Documentation**: https://docs.sendgrid.com
- **SendGrid SMTP Setup**: https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-sendgrid-api
- **Integration Guide**: `/home/user/imobi/SENDGRID_INTEGRATION_GUIDE.md`
- **Code Snippets**: `/home/user/imobi/EMAIL_IMPLEMENTATION_SNIPPETS.md`
- **Test Script**: `/home/user/imobi/services/api/test-email-integration.sh`

---

## Sign-Off

**Prepared By**: Claude Code Assistant  
**Date**: June 22, 2026  
**Status**: Ready for Implementation  
**Contact**: contato.vinicaetano93@gmail.com  

**Next Action**: Complete the checklist above and redeploy application

---

**Estimated Total Time to Production**: 45 minutes + 24 hours (DNS propagation is optional)
