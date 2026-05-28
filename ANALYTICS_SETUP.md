# Analytics Dashboard Setup

## Overview

The analytics dashboard provides comprehensive tracking of user behavior, conversions, and financial metrics throughout the imbobi platform. It combines event tracking with calculated analytics to deliver actionable insights.

## Architecture

### Backend Components

1. **AuditService** (`services/api/src/common/services/audit.service.ts`)
   - Event logging with structured data
   - Supports 14 key events across the user journey
   - Timestamp, user ID, and details tracking

2. **AnalyticsService** (`services/api/src/common/services/analytics.service.ts`)
   - Computes analytics metrics from database
   - Provides 4 main analytics endpoints
   - Supports date range filtering

3. **AnalyticsController** (`services/api/src/modules/analytics/analytics.controller.ts`)
   - REST API endpoints for analytics data
   - Query parameter support for date filtering

### Frontend Components

1. **Analytics Layout** (`apps/web/app/analytics/layout.tsx`)
   - Navigation sidebar for analytics sections
   - Link back to main dashboard

2. **Analytics Pages**
   - `overview/page.tsx` - KPI overview and funnel analysis
   - `funnel/page.tsx` - Detailed conversion funnel visualization
   - `cohorts/page.tsx` - Cohort analysis with retention metrics
   - `revenue/page.tsx` - Financial metrics and revenue analysis

## Event Taxonomy

### Core Events

| Event | Trigger | Details Tracked | Analytics Impact |
|-------|---------|-----------------|------------------|
| `USER_SIGNUP` | User registration completed | email | Funnel start |
| `USER_LOGIN` | User logs in | email | Active users |
| `KYC_UPLOAD` | User uploads KYC document | documentoId, tipo | KYC upload rate |
| `KYC_APPROVAL` | Admin approves KYC | documentoId, gestorId | KYC approval rate |
| `KYC_REJECTION` | Admin rejects KYC | documentoId, motivo, gestorId | Rejection tracking |
| `CREDIT_REQUESTED` | User requests credit | creditoId, valorSolicitado, prazoMeses | Credit request rate |
| `CREDIT_APPROVED` | Credit is approved | creditoId, valorAprovado | Credit approval rate |
| `PAYMENT_RELEASED` | Payment is released | creditoId, parcelaNum, valor | Disbursement tracking |
| `STAGE_COMPLETED` | Work stage completed | etapaId, obraId | Stage completion rate |
| `EVIDENCE_UPLOAD` | User uploads evidence | obraId | Evidence upload rate |
| `STAGE_APPROVAL` | Stage is approved | etapaId | Stage approval rate |
| `STAGE_REJECTION` | Stage is rejected | etapaId, motivo | Rejection tracking |
| `TOKEN_REFRESH` | JWT token refreshed | (empty) | Session tracking |
| `USER_REGISTRATION` | Alias for USER_SIGNUP | email | User acquisition |

### Event Logging Example

```typescript
// In auth.service.ts after successful registration
this.auditService.logUserSignup(usuarioId, email, ipAddress);

// In kyc.service.ts after KYC approval
this.auditService.logKycApproval(usuarioId, documentoId, gestorId, ipAddress);

// In credito.service.ts after credit request
this.auditService.logCreditRequested(usuarioId, creditoId, valorSolicitado, prazoMeses, ipAddress);
```

## Dashboard Definitions

### 1. Overview Dashboard (`/analytics/overview`)

**Purpose:** High-level KPIs and funnel visualization

**Metrics Displayed:**
- Total Signups (last 90 days)
- Total Logins (all time)
- KYC Upload Rate (%)
- KYC Approval Rate (%)
- Credit Request Rate (%)
- Credit Approval Rate (%)
- Payments Processed (#)
- Total Credit Origination (R$)
- Total Credit Released (R$)
- Stages Completed (#)

**Visualizations:**
- KPI cards with numeric values
- Progressive funnel bars showing conversion rates

### 2. Funnel Dashboard (`/analytics/funnel`)

**Purpose:** Detailed conversion funnel analysis

**Metrics:**
- Signup → KYC Upload → KYC Approved → Credit Request → Credit Approved → Payment

**Calculations:**
- Absolute numbers per stage
- Conversion rate between consecutive stages
- Overall conversion rates

**Visualizations:**
- Horizontal bar chart with proportional widths
- Stage-to-stage conversion percentages

### 3. Cohorts Dashboard (`/analytics/cohorts`)

**Purpose:** User retention and lifetime value by cohort

**Metrics per Cohort:**
- Signups in month
- Day 7 Retention (%)
- Day 30 Retention (%)
- Average LTV (Lifetime Value)

**Definition of Retention:**
- Day 7: Users who uploaded KYC within 7 days of signup
- Day 30: Users who requested credit within 30 days of signup
- LTV: Average approved credit value for cohort

**Visualizations:**
- Table with retention bars
- Month-over-month comparison

### 4. Revenue Dashboard (`/analytics/revenue`)

**Purpose:** Financial metrics and disbursement analysis

**Metrics (last 90 days):**
- Total Origination Value (sum of approved credits)
- Total Released Value (sum of disbursements)
- Average Loan Size (origination / count)
- Total Interest Generated (based on rate and term)
- Disbursement Rate (released / originated %)

**Visualizations:**
- KPI cards
- Flow diagram showing origination to disbursement
- Financial summary table

## Metrics Definitions

### Conversion Rates

```
KYC Upload Rate = (Users with KYC uploads / Total signups) × 100%
KYC Approval Rate = (Users with approved KYC / Users with KYC uploads) × 100%
Credit Request Rate = (Users with credit requests / Users with approved KYC) × 100%
Credit Approval Rate = (Users with approved credit / Users with credit requests) × 100%
```

### Retention Metrics

```
Day 7 Retention = (Users active in first 7 days / Cohort size) × 100%
Day 30 Retention = (Users active in first 30 days / Cohort size) × 100%
```

### Revenue Metrics

```
Average Loan Size = Total Origination Value / Number of Credits
Total Interest = SUM(valorAprovado × taxaMensal × prazoMeses)
Disbursement Rate = (Total Released / Total Originated) × 100%
```

## API Endpoints

All endpoints are prefixed with `/api/v1/analytics`

### GET /overview
Retrieves overview KPIs for a date range.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string (default: 90 days ago)
- `endDate` (optional): ISO 8601 date string (default: now)

**Response:**
```json
{
  "totalSignups": 150,
  "totalLogins": 245,
  "kycUploadRate": 65.3,
  "kycApprovalRate": 78.5,
  "creditRequestRate": 82.1,
  "creditApprovalRate": 71.2,
  "paymentsProcessed": 45,
  "totalCreditOriginationValue": 450000,
  "totalCreditReleasedValue": 380000,
  "stagesCompleted": 89
}
```

### GET /funnel
Retrieves funnel metrics for a date range.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response:**
```json
{
  "signup": 150,
  "kycUpload": 98,
  "kycApproved": 77,
  "creditRequested": 63,
  "creditApproved": 45,
  "paymentProcessed": 38
}
```

### GET /cohorts
Retrieves cohort analysis for specified number of months.

**Query Parameters:**
- `months` (optional): Number of months to analyze (default: 12)

**Response:**
```json
[
  {
    "cohort": "2026-05",
    "signups": 150,
    "day7Retention": 65.3,
    "day30Retention": 48.7,
    "avgLTV": 3000
  },
  {
    "cohort": "2026-04",
    "signups": 142,
    "day7Retention": 62.1,
    "day30Retention": 51.4,
    "avgLTV": 3200
  }
]
```

### GET /revenue
Retrieves revenue metrics for a date range.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response:**
```json
{
  "totalOriginationValue": 450000,
  "totalReleasedValue": 380000,
  "avgLoanSize": 10000,
  "totalInterestGenerated": 32400,
  "disbursementRate": 84.4
}
```

## SQL Queries for Manual Reports

### Monthly Signup Trends
```sql
SELECT 
  DATE_TRUNC('month', "criadoEm") as month,
  COUNT(*) as signups
FROM "Usuario"
WHERE "criadoEm" >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', "criadoEm")
ORDER BY month DESC;
```

### KYC Approval Timeline
```sql
SELECT 
  DATE_TRUNC('day', "analisadoEm") as approval_date,
  COUNT(*) as approvals,
  COUNT(CASE WHEN status = 'APROVADO' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'REJEITADO' THEN 1 END) as rejected
FROM "KycDocumento"
WHERE "analisadoEm" IS NOT NULL
GROUP BY DATE_TRUNC('day', "analisadoEm")
ORDER BY approval_date DESC;
```

### Credit Pipeline Analysis
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG("valorAprovado") as avg_value,
  SUM("valorAprovado") as total_value
FROM "Credito"
WHERE "criadoEm" >= NOW() - INTERVAL '90 days'
GROUP BY status;
```

### User Journey Funnel
```sql
SELECT 
  COUNT(DISTINCT u."usuarioId") as signups,
  COUNT(DISTINCT k."usuarioId") as kyc_uploaded,
  COUNT(DISTINCT CASE WHEN k.status = 'APROVADO' THEN k."usuarioId" END) as kyc_approved,
  COUNT(DISTINCT c."usuarioId") as credit_requested,
  COUNT(DISTINCT CASE WHEN c.status = 'APROVADO' THEN c."usuarioId" END) as credit_approved
FROM "Usuario" u
LEFT JOIN "KycDocumento" k ON u."usuarioId" = k."usuarioId"
LEFT JOIN "Credito" c ON u."usuarioId" = c."usuarioId"
WHERE u."criadoEm" >= NOW() - INTERVAL '90 days';
```

### Disbursement Rate Analysis
```sql
SELECT 
  c."creditoId",
  c."valorAprovado",
  COALESCE(SUM(l."valor"), 0) as total_released,
  ROUND((COALESCE(SUM(l."valor"), 0) / c."valorAprovado" * 100)::numeric, 2) as disbursement_pct
FROM "Credito" c
LEFT JOIN "Liberacao" l ON c."creditoId" = l."creditoId"
WHERE c."criadoEm" >= NOW() - INTERVAL '90 days'
GROUP BY c."creditoId", c."valorAprovado"
ORDER BY disbursement_pct DESC;
```

## Integration Checklist

- [x] Add events to AuditService
- [x] Create AnalyticsService with metric calculations
- [x] Create AnalyticsController API endpoints
- [x] Add AnalyticsModule to app.module.ts
- [ ] Update auth.service.ts to log USER_SIGNUP
- [ ] Update kyc.service.ts to log KYC events
- [ ] Update credito.service.ts to log CREDIT events
- [ ] Update liberacao worker to log PAYMENT_RELEASED
- [ ] Update etapas.service.ts to log STAGE events
- [ ] Test all analytics endpoints
- [ ] Add date range filtering UI
- [ ] Set up monitoring/alerting for key metrics

## Frontend Integration Example

### Calling Analytics API

```typescript
// Fetch overview metrics
const response = await fetch(
  `/api/v1/analytics/overview?startDate=${startDate}&endDate=${endDate}`
);
const data = await response.json();

// Use data for rendering
setMetrics(data);
```

## Future Enhancements

1. **Event Analytics Service Integration**
   - PostHog, Mixpanel, or Segment for real-time tracking
   - Client-side event tracking in web and mobile apps
   - Custom event properties and user traits

2. **Advanced Dashboards**
   - Geographic analysis (by region/state)
   - Segmentation by user type (TOMADOR, GESTOR_OBRA, etc.)
   - Time-series forecasting for metrics
   - Anomaly detection

3. **Alerts and Monitoring**
   - Threshold-based alerts on key metrics
   - Daily/weekly summary emails
   - Slack integration for critical alerts

4. **Data Retention**
   - Archive old audit logs
   - Implement data warehouse for analytics
   - Real-time dashboards with streaming data

5. **Custom Reports**
   - User-configurable reports
   - Email scheduling
   - PDF export with charts

## Troubleshooting

### Missing Analytics Data
- Ensure events are being logged by checking logs
- Verify database has data for the date range
- Check API returns correct date formats

### Performance Issues
- Consider adding indexes on `criadoEm`, `status`, `analisadoEm`
- Use caching for frequently accessed metrics
- Implement pagination for large datasets

### Incorrect Conversions
- Verify event logic matches defined metrics
- Check for duplicate events in logs
- Validate date filters in queries

## Support

For questions or issues with the analytics dashboard:
1. Check the API response format
2. Review SQL queries for data accuracy
3. Verify event logging in services
4. Check browser console for frontend errors
