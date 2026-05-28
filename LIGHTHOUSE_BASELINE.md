# Lighthouse Performance Baseline

**Baseline Created**: 2026-05-28T03:35Z  
**Date**: 2026-05-28  
**Project**: imbobi — Construction Finance Platform  
**Environment**: Development (local)

## Executive Summary

This document establishes the performance baseline for the imbobi web application across key user flows. Lighthouse scores are captured for critical pages to track performance regressions and improvements over time.

## Testing Methodology

- **Tool**: Lighthouse CI / Lighthouse API
- **Environment**: Chrome DevTools, Development Build
- **Network Throttling**: Simulated Fast 4G
- **Device**: Desktop & Mobile (Pixel 5)
- **Cache**: Disabled for reproducibility
- **Runs per URL**: 3 (results averaged)

## Performance Targets

Baseline validation targets established **2026-05-28T03:35Z**.

### Lighthouse Score Targets
| Metric | Desktop Target | Mobile Target |
|--------|---|---|
| Performance | >= 80 | >= 60 |
| Accessibility | >= 90 | >= 90 |
| Best Practices | >= 90 | >= 90 |
| SEO | >= 90 | >= 90 |

### Core Web Vitals Targets
| Metric | Desktop Target | Mobile Target |
|--------|---|---|
| LCP | < 2.5s | < 4.0s |
| FID | < 100ms | < 100ms |
| CLS | < 0.1 | < 0.1 |

**Note**: These targets should be validated manually via Chrome DevTools Lighthouse audit on both desktop and mobile viewports. Test on throttled networks (Simulated Fast 4G) with cache disabled for accuracy.

## Critical User Flows

### 1. Login Page (`/`)
**Route**: `apps/web/app/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Mobile Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Core Web Vitals (Desktop):**
- LCP (Largest Contentful Paint): TBD
- FID (First Input Delay): TBD
- CLS (Cumulative Layout Shift): TBD

**Core Web Vitals (Mobile):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Bottlenecks Identified:**
- TBD

**Optimization Opportunities:**
- TBD

---

### 2. Criar Obra Page (`/obras/criar`)
**Route**: `apps/web/app/(authenticated)/obras/criar/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Mobile Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Core Web Vitals (Desktop):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Core Web Vitals (Mobile):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Assets Loaded:**
- JavaScript: TBD KB
- CSS: TBD KB
- Images: TBD KB

**Bottlenecks Identified:**
- TBD

**Optimization Opportunities:**
- Consider lazy-loading of form fields
- Implement virtual scrolling for etapa lists if large
- Optimize map component rendering

---

### 3. Vistoria Page (`/obras/{id}/vistoria`)
**Route**: `apps/web/app/(authenticated)/obras/[id]/vistoria/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Mobile Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Core Web Vitals (Desktop):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Core Web Vitals (Mobile):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Image Optimization:**
- Evidence photos: TBD (lazy-loaded)
- Map tiles: TBD

**Bottlenecks Identified:**
- TBD

**Optimization Opportunities:**
- Implement image lazy-loading for evidence gallery
- Consider compression of uploaded evidence photos
- Cache map tiles at service worker level

---

### 4. KYC Page (`/kyc`)
**Route**: `apps/web/app/(authenticated)/kyc/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Mobile Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Core Web Vitals (Desktop):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Core Web Vitals (Mobile):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Assets:**
- Document upload component: TBD KB
- Preview images: TBD KB

**Bottlenecks Identified:**
- TBD

**Optimization Opportunities:**
- Compress document previews
- Lazy-load document gallery items
- Implement resumable uploads for large files

---

### 5. Credito Page (`/credito`)
**Route**: `apps/web/app/(authenticated)/credito/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Mobile Lighthouse Scores:**
```
Performance:     TBD (baseline to be established)
Accessibility:   TBD
Best Practices:  TBD
SEO:             TBD
```

**Core Web Vitals (Desktop):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Core Web Vitals (Mobile):**
- LCP: TBD
- FID: TBD
- CLS: TBD

**Chart Performance:**
- Recharts library impact: TBD
- Large dataset rendering: TBD

**Bottlenecks Identified:**
- TBD

**Optimization Opportunities:**
- Implement virtual scrolling for payment schedule tables
- Lazy-load charts (Recharts)
- Consider canvas-based rendering for complex charts
- Paginate large credit lists

---

## API Performance Baselines

### Authentication Endpoints
```
POST /api/v1/auth/registrar:  < 1000ms (bcrypt + DB write)
POST /api/v1/auth/login:      < 500ms
POST /api/v1/auth/renovar:    < 300ms (token generation only)
POST /api/v1/auth/logout:     < 200ms
GET  /api/v1/usuarios/meu-perfil: < 200ms
```

### Obra Endpoints
```
POST /api/v1/obras:           < 800ms (includes etapa generation)
GET  /api/v1/obras/{id}:      < 300ms (with etapas joined)
GET  /api/v1/obras:           < 500ms (paginated list)
```

### KYC Endpoints
```
POST /api/v1/kyc/upload:      < 400ms
GET  /api/v1/kyc/status:      < 250ms
GET  /api/v1/kyc/documentos:  < 200ms
```

### Credit Endpoints
```
POST /api/v1/credito/simular:      < 150ms (no DB)
POST /api/v1/credito/solicitar:    < 600ms
GET  /api/v1/credito/meus:         < 400ms
GET  /api/v1/credito/{id}/extrato: < 300ms (cached)
```

### Vistoria Endpoints
```
POST /api/v1/evidencias:           < 1500ms (file upload + S3)
GET  /api/v1/evidencias/{etapaId}: < 300ms
POST /api/v1/vistoria/{id}/aprovar: < 500ms
```

---

## Optimization Recommendations

### Frontend (Next.js/Web)
1. **Code Splitting**: Implement route-based code splitting for authenticated sections
2. **Image Optimization**: Use next/image with blur placeholders for evidence photos
3. **Dynamic Imports**: Lazy-load form components and charts
4. **CSS-in-JS**: Consider CSS modules or Tailwind optimization
5. **Caching**: Implement stale-while-revalidate for static assets

### API (NestJS)
1. **Database Indexing**: Ensure indexes on `usuarioId`, `obraId`, `etapaId` queries
2. **Query Optimization**: Use `select()` to avoid N+1 queries
3. **Caching**: Implement Redis caching for KYC status, credit simulations
4. **Rate Limiting**: Throttle file uploads and credit simulations
5. **Pagination**: Implement cursor-based pagination for large result sets

### Storage (S3)
1. **CDN**: Serve evidence photos through CloudFront
2. **Compression**: Compress images before upload (Sharp is already configured)
3. **Presigned URLs**: Cache presigned URLs for 15-30 minutes

### Database (PostgreSQL + PostGIS)
1. **Spatial Indexes**: GIST or BRIN indexes on lat/lng columns
2. **Partitioning**: Partition large tables by date (evidencias, creditos)
3. **Connection Pooling**: Increase PgBouncer connection pool size

---

## Monitoring & Continuous Tracking

### Tools Configured
- **Lighthouse CI**: Integrate with GitHub Actions
- **Web Vitals**: Implement web-vitals library in frontend
- **APM**: Consider New Relic or DataDog for production monitoring

### Alerting Thresholds
- Performance score drop > 10 points: ⚠️ Warning
- LCP increase > 0.5s: ⚠️ Warning
- CLS increase > 0.05: ⚠️ Warning

### Monthly Review Schedule
- First Monday of each month at 10:00 AM
- Compare against previous baseline
- Flag regressions and plan optimizations

---

## Historical Baselines

| Date | Desktop Perf | Mobile Perf | Status | Notes |
|------|---|---|---|---|
| 2026-05-28 | TBD | TBD | Initial Baseline | Establishing baseline metrics |

---

## How to Capture Scores

### Manual Testing via Chrome DevTools
1. Open each URL in Chrome: `https://imbobi.vercel.app/`
2. Open DevTools (F12) → Lighthouse tab
3. Configure: Desktop/Mobile mode, Simulated Fast 4G, Cache disabled
4. Click "Analyze page load"
5. Record scores for Performance, Accessibility, Best Practices, SEO
6. Document Core Web Vitals: LCP, FID, CLS
7. Replace TBD values in sections above with actual scores

### Batch Testing via Lighthouse CI
- Configure `.lighthouse.json` with URLs and thresholds
- Run: `lighthouse-ci autorun`
- Integrate with GitHub Actions for continuous monitoring

## Next Steps

1. Run Lighthouse audit for all 5 critical pages (manual or CI)
2. Document actual scores in this baseline
3. Identify top 3 optimization opportunities per page
4. Implement performance optimizations in priority order
5. Re-run audits after each optimization sprint
6. Establish CI/CD performance regression detection

---

**Document Owner**: DevOps / Performance Engineering  
**Last Updated**: 2026-05-28  
**Review Frequency**: Monthly
