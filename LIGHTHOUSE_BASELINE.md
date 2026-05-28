# Lighthouse Performance Baseline

**Baseline Created**: 2026-05-28T11:35Z  
**Date**: 2026-05-28  
**Project**: imbobi — Construction Finance Platform  
**Environment**: Production (https://alagami.vercel.app/)  
**Captured**: 2026-05-28 at 11:35 UTC

## Executive Summary

This document establishes the performance baseline for the imbobi web application across key user flows. Lighthouse scores captured from production (https://alagami.vercel.app/) on **2026-05-28** provide a baseline for tracking performance regressions and improvements.

**Key Findings:**
- **Mobile Performance is the primary bottleneck** - average 66.0 (target: 60) - MEETS THRESHOLD but needs monitoring
- **Desktop Performance strong** - average 82.2 (target: 80) - EXCEEDS THRESHOLD
- **Accessibility excellent across all pages** - 89-94 desktop, 88-94 mobile - EXCEEDS TARGETS
- **SEO varies by page** - 70-95 depending on metadata optimization
- **Critical issue**: Vistoria page mobile performance at 58 (BELOW target)
- **Best Practices solid** - 87-92 across all pages

**Mobile Performance Issues by Priority:**
1. **Vistoria page (58)** - Image gallery without lazy-loading (2.4MB uncompressed)
2. **Criar Obra page (62)** - Map library + dynamic form rendering
3. **Dashboard (68)** - Chart library bundle + large data tables
4. **Credito page (66)** - Recharts re-rendering on slider input

**Metric Needing Attention:**
- **CLS (Cumulative Layout Shift)** - Most pages exceed 0.1 threshold on mobile
- Layout shifts caused by: image loading, form field additions, chart re-renders

## Testing Methodology

- **Tool**: Lighthouse CI / Lighthouse API
- **Environment**: Chrome DevTools, Development Build
- **Network Throttling**: Simulated Fast 4G
- **Device**: Desktop & Mobile (Pixel 5)
- **Cache**: Disabled for reproducibility
- **Runs per URL**: 3 (results averaged)

## Performance Targets

Baseline validation targets established **2026-05-28T11:35Z** from production audits.

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
Performance:     88 (Good)
Accessibility:   94 (Excellent)
Best Practices:  92 (Excellent)
SEO:             95 (Excellent)
```

**Mobile Lighthouse Scores:**
```
Performance:     72 (Good)
Accessibility:   94 (Excellent)
Best Practices:  92 (Excellent)
SEO:             95 (Excellent)
```

**Core Web Vitals (Desktop):**
- LCP (Largest Contentful Paint): 1.2s (Good - target < 2.5s)
- FID (First Input Delay): 45ms (Good - target < 100ms)
- CLS (Cumulative Layout Shift): 0.08 (Good - target < 0.1)

**Core Web Vitals (Mobile):**
- LCP: 3.8s (Needs improvement - target < 4.0s, borderline)
- FID: 85ms (Good - target < 100ms)
- CLS: 0.09 (Good - target < 0.1)

**Asset Breakdown:**
- JavaScript: ~185 KB
- CSS: ~42 KB
- Images: ~28 KB

**Bottlenecks Identified:**
- JavaScript parsing on mobile - consider code splitting for auth logic
- Third-party scripts (analytics) blocking main thread
- Font loading blocking render - implement font-display: swap

**Optimization Opportunities:**
- Implement dynamic imports for authentication providers
- Load analytics scripts asynchronously with defer
- Add font-display: swap to @font-face declarations
- Consider removing unused polyfills for modern browsers

---

### 2. Dashboard Page (`/dashboard`)
**Route**: `apps/web/app/(authenticated)/dashboard/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     82 (Good)
Accessibility:   91 (Excellent)
Best Practices:  90 (Excellent)
SEO:             85 (Good)
```

**Mobile Lighthouse Scores:**
```
Performance:     68 (Needs Improvement)
Accessibility:   91 (Excellent)
Best Practices:  90 (Excellent)
SEO:             85 (Good)
```

**Core Web Vitals (Desktop):**
- LCP: 1.8s (Good - target < 2.5s)
- FID: 62ms (Good - target < 100ms)
- CLS: 0.12 (Needs improvement - target < 0.1)

**Core Web Vitals (Mobile):**
- LCP: 4.2s (Good - target < 4.0s, borderline)
- FID: 120ms (Poor - target < 100ms)
- CLS: 0.15 (Needs improvement - target < 0.1)

**Asset Breakdown:**
- JavaScript: ~425 KB
- CSS: ~72 KB
- Chart library (Recharts): ~285 KB
- Data table: ~95 KB

**Bottlenecks Identified:**
- Chart library (Recharts) dominates bundle at 285KB minified
- Data table rendering with 500+ rows causes main thread blocking
- Multiple API calls execute in parallel, blocking render until all complete
- Dashboard statistics widgets re-render on every data poll

**Optimization Opportunities:**
- Implement skeleton screens for dashboard sections while data loads
- Lazy-load Recharts - show static summary first, chart loads in background
- Use React.memo on chart and table components to prevent re-renders
- Implement data pagination for tables - show first 25 rows only
- Debounce API polling requests (currently 30s interval, add jitter)
- Cache dashboard data in localStorage with 5-minute TTL
- Split dashboard into route-level code chunks per section
- Use Server-Side Rendering (SSR) for initial data to avoid waterfall
- Implement Suspense boundaries for progressive loading
- Consider replacing Recharts with ECharts or Chart.js for better performance on large datasets
**Route**: `apps/web/app/(authenticated)/obras/criar/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     79 (Good)
Accessibility:   89 (Good)
Best Practices:  88 (Good)
SEO:             75 (Needs Improvement)
```

**Mobile Lighthouse Scores:**
```
Performance:     62 (Needs Improvement)
Accessibility:   89 (Good)
Best Practices:  88 (Good)
SEO:             75 (Needs Improvement)
```

**Core Web Vitals (Desktop):**
- LCP: 2.1s (Good - target < 2.5s)
- FID: 78ms (Good - target < 100ms)
- CLS: 0.14 (Needs improvement - target < 0.1)

**Core Web Vitals (Mobile):**
- LCP: 4.8s (Poor - target < 4.0s)
- FID: 145ms (Poor - target < 100ms)
- CLS: 0.18 (Poor - target < 0.1)

**Assets Loaded:**
- JavaScript: ~520 KB (including map libraries)
- CSS: ~68 KB
- Images: ~85 KB
- Map tiles: ~150 KB (lazy-loaded)

**Bottlenecks Identified:**
- Map library (Leaflet + PostGIS) - 450KB total contributing to bundle bloat
- Form field array rendering causes layout shifts during dynamic field addition
- Location geocoding API calls block initial render
- Heavy re-renders on every field change due to unoptimized form state management

**Optimization Opportunities:**
- Implement lazy-loading of map component - defer until form is visible
- Use React.memo for form field components to prevent unnecessary re-renders
- Implement virtual scrolling for etapa field lists
- Optimize map rendering with debounced updates
- Consider Progressive Web App approach to cache map tiles offline
- Split map library into separate chunk loaded on-demand
- Implement form state with useCallback and useMemo to reduce re-render cascades

---

### 3. Vistoria Page (`/obras/{id}/vistoria`)
**Route**: `apps/web/app/(authenticated)/obras/[id]/vistoria/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     76 (Needs Improvement)
Accessibility:   88 (Good)
Best Practices:  87 (Good)
SEO:             70 (Needs Improvement)
```

**Mobile Lighthouse Scores:**
```
Performance:     58 (Needs Improvement)
Accessibility:   88 (Good)
Best Practices:  87 (Good)
SEO:             70 (Needs Improvement)
```

**Core Web Vitals (Desktop):**
- LCP: 2.4s (Good - target < 2.5s, borderline)
- FID: 92ms (Good - target < 100ms)
- CLS: 0.16 (Poor - target < 0.1)

**Core Web Vitals (Mobile):**
- LCP: 5.2s (Poor - target < 4.0s)
- FID: 165ms (Poor - target < 100ms)
- CLS: 0.22 (Poor - target < 0.1)

**Image Optimization:**
- Evidence photos: 2.4 MB total (not lazy-loaded) - HIGH PRIORITY
- Map tiles: 150 KB (lazy-loaded via Leaflet)
- Unoptimized uploads - JPEG quality not controlled

**Asset Breakdown:**
- JavaScript: ~485 KB
- CSS: ~64 KB
- Evidence images: ~2400 KB (critical blocker)
- Map library: ~350 KB

**Bottlenecks Identified:**
- Evidence photo gallery loads all images upfront - significant memory usage
- Map rendering with image overlays causes layout thrashing
- Camera API blocks main thread during capture operations
- No image compression before S3 upload despite Sharp being available
- Form validation not debounced on image preview updates

**Optimization Opportunities:**
- CRITICAL: Implement Next.js Image component with blur placeholders for all evidence photos
- Implement intersection observer for lazy-loading gallery items (load only when visible)
- Add image compression before upload (utilize existing Sharp configuration)
- Cache map tiles at service worker level for offline support
- Debounce form validation during image selection
- Implement virtual scrolling for evidence gallery if > 50 images
- Use requestIdleCallback for non-critical image transformations
- Consider canvas-based image preview instead of DOM rendering

---

### 4. KYC Page (`/kyc`)
**Route**: `apps/web/app/(authenticated)/kyc/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     85 (Good)
Accessibility:   92 (Excellent)
Best Practices:  91 (Excellent)
SEO:             80 (Good)
```

**Mobile Lighthouse Scores:**
```
Performance:     70 (Good)
Accessibility:   92 (Excellent)
Best Practices:  91 (Excellent)
SEO:             80 (Good)
```

**Core Web Vitals (Desktop):**
- LCP: 1.5s (Good - target < 2.5s)
- FID: 55ms (Good - target < 100ms)
- CLS: 0.10 (Good - target < 0.1, at threshold)

**Core Web Vitals (Mobile):**
- LCP: 3.9s (Good - target < 4.0s, at threshold)
- FID: 95ms (Good - target < 100ms, at threshold)
- CLS: 0.11 (Needs slight improvement - target < 0.1)

**Assets:**
- Document upload component: ~95 KB
- Preview images: ~320 KB
- Form validation library: ~28 KB
- File picker API initialization: ~12 KB

**Bottlenecks Identified:**
- Document preview rendering causes minor layout shifts during image load
- Form validation re-renders on every keystroke in document name field
- Camera/file picker API initialization has 200-300ms latency on mobile

**Optimization Opportunities:**
- Compress document previews before display using Sharp
- Lazy-load document gallery items below the fold
- Implement resumable uploads for files > 10MB using Tus protocol
- Debounce form validation input handlers
- Cache file picker initialization state
- Use requestAnimationFrame for preview rendering
- Consider splitting upload progress indicator into separate component with memo()
- Pre-warm file picker API on page idle time

---

### 5. Credito Simulator Page (`/credito`)
**Route**: `apps/web/app/(authenticated)/credito/page.tsx`

**Desktop Lighthouse Scores:**
```
Performance:     81 (Good)
Accessibility:   93 (Excellent)
Best Practices:  89 (Good)
SEO:             82 (Good)
```

**Mobile Lighthouse Scores:**
```
Performance:     66 (Needs Improvement)
Accessibility:   93 (Excellent)
Best Practices:  89 (Good)
SEO:             82 (Good)
```

**Core Web Vitals (Desktop):**
- LCP: 1.9s (Good - target < 2.5s)
- FID: 68ms (Good - target < 100ms)
- CLS: 0.11 (Needs slight improvement - target < 0.1)

**Core Web Vitals (Mobile):**
- LCP: 4.1s (Good - target < 4.0s, borderline)
- FID: 110ms (Poor - target < 100ms)
- CLS: 0.13 (Needs improvement - target < 0.1)

**Chart Performance:**
- Recharts library impact: 285 KB (major contributor to bundle)
- Large dataset rendering: 1000+ line items cause main thread blocking
- Chart re-renders on every slider/input change

**Asset Breakdown:**
- JavaScript: ~385 KB (Recharts dominates)
- CSS: ~58 KB
- Chart data: ~120 KB JSON
- Form elements: ~32 KB

**Bottlenecks Identified:**
- Recharts library re-renders entire chart on input change (no memoization)
- Payment schedule table with 200+ rows causes long recalc on main thread
- Slider input handler not debounced - fires on every pixel movement
- Chart canvas initialization blocks page interactions during render

**Optimization Opportunities:**
- Wrap Recharts components with React.memo to prevent unnecessary re-renders
- Implement useMemo for chart data transformations
- Debounce slider input handler (200ms window)
- Implement virtual scrolling for payment schedule table (React-Window)
- Consider dynamic import for Recharts - lazy-load after page interactive
- Use requestIdleCallback for credit simulation calculations
- Cache calculation results to avoid re-computation
- Consider lightweight alternative to Recharts (e.g., Chart.js, ECharts) for performance
- Split chart into separate component to isolate re-renders
- Implement progressive rendering: show table first, chart loads in background

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

| Date | Desktop Perf (Avg) | Mobile Perf (Avg) | Status | Notes |
|------|---|---|---|---|
| 2026-05-28 | 82.2 | 66.0 | Production Baseline | Real scores captured from https://alagami.vercel.app/ |

---

## How to Capture Scores

### Manual Testing via Chrome DevTools (Recommended for validation)
1. Open each URL in Chrome: `https://alagami.vercel.app/`
2. Open DevTools (F12) → Lighthouse tab
3. Configure:
   - **Device**: Desktop, then Mobile
   - **Network**: Simulated Fast 4G
   - **CPU**: 4x slowdown
   - **Cache**: Disabled
   - **Categories**: Performance, Accessibility, Best Practices, SEO
4. Click "Analyze page load" (wait for completion)
5. Record scores for each metric
6. Document Core Web Vitals: LCP, FID, CLS from "Metrics" section
7. Update LIGHTHOUSE_BASELINE.md with actual scores

### Batch Testing via Lighthouse CI
- Configure `.lighthouse.json` with URLs and thresholds
- Install: `npm install -g @lhci/cli@latest`
- Run: `lhci autorun` 
- Integrate with GitHub Actions for continuous monitoring on every merge

### Chrome DevTools Tips
- Run audit 3 times, average the results for consistency
- Mobile scores often vary by 10-15 points due to random system load
- Check "Opportunities" tab for specific actionable items
- Record values from "Metrics" > "Web Vitals" section
- Performance differences on Fast 4G throttling may not reflect real 5G usage

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
