# Frontend Performance Optimization Guide

## Overview

Target Lighthouse scores for Imobi web frontend:
- **Performance**: > 80
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

---

## 1. Performance Metrics

### Core Web Vitals

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Largest Contentful Paint (LCP) | < 2.5s | ~2.8s | 🔶 |
| First Input Delay (FID) | < 100ms | ~50ms | ✅ |
| Cumulative Layout Shift (CLS) | < 0.1 | ~0.08 | ✅ |
| First Contentful Paint (FCP) | < 1.8s | ~1.5s | ✅ |
| Time to Interactive (TTI) | < 3.8s | ~3.2s | ✅ |

### Current Bundle Sizes

```
Main Bundle:    ~250 KB (gzipped: ~65 KB)
CSS:           ~180 KB (gzipped: ~35 KB)
Images:        Varies
JS:            ~210 KB (gzipped: ~55 KB)
```

---

## 2. Optimization Strategies

### 2.1 Code Splitting

```typescript
// ✅ Dynamic imports for code splitting
import dynamic from 'next/dynamic';

const CreditSimulator = dynamic(
  () => import('@/components/CreditSimulator'),
  { loading: () => <Skeleton /> }
);

// Reduce initial bundle by ~40 KB
```

### 2.2 Image Optimization

```typescript
// ✅ Use Next.js Image component
import Image from 'next/image';

<Image
  src="/obra.jpg"
  alt="Construction site"
  width={800}
  height={600}
  priority={false}  // Only for above-the-fold
  placeholder="blur"  // Show blur while loading
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// Automatic:
// - Lazy loading
// - Responsive images
// - Format conversion (WEBP)
// - Compression
```

### 2.3 Font Optimization

```typescript
// In app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  preload: true,
  display: 'swap',  // Avoid font flash
});
```

### 2.4 CSS Optimization

```css
/* ✅ Use Tailwind CSS (purges unused styles) */
/* Current: ~35 KB (gzipped) */

/* ❌ Avoid critical CSS above fold */
/* Inline critical CSS for faster FCP */
```

### 2.5 JavaScript Optimization

```typescript
// ✅ Tree-shake unused dependencies
// ❌ Avoid large date libraries (use date-fns instead of moment)

// ✅ Use production builds
// 'use client' for client-only components
// Minimize useEffect hooks

export function Component() {
  // ✅ Avoid expensive computations in render
  const memoizedValue = useMemo(() => expensiveCalculation(), [deps]);
  
  // ✅ Lazy load heavy components
  const HeavyChart = lazy(() => import('./HeavyChart'));
}
```

---

## 3. Implementation Checklist

### Phase 1: Quick Wins (1-2 hours)

- [ ] Enable Next.js Image optimization on all images
- [ ] Implement dynamic imports for route-based code splitting
- [ ] Add `loading="lazy"` to below-the-fold images
- [ ] Remove unused CSS libraries
- [ ] Defer non-critical JavaScript

```bash
# Check bundle size
pnpm build
cd .next
du -sh . # Total size
```

### Phase 2: Medium Effort (3-5 hours)

- [ ] Implement service worker for caching
- [ ] Add Redis caching for API responses
- [ ] Compress and optimize images (WEBP)
- [ ] Minify CSS and JavaScript
- [ ] Remove unused npm packages

```typescript
// Example: Redis caching in API layer
const cacheKey = `usuarios:${id}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await database.query(...);
await redis.set(cacheKey, JSON.stringify(data), { ex: 3600 });
```

### Phase 3: Advanced (6-10 hours)

- [ ] Implement HTTP/2 Server Push
- [ ] Enable GZIP compression
- [ ] Set up CDN for static assets
- [ ] Implement database query optimization
- [ ] Add database connection pooling

---

## 4. Bundle Analysis

```bash
# Analyze bundle size
pnpm add -D @next/bundle-analyzer

# In next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true pnpm build
```

### Current Bundle Breakdown

```
Pages and Static Assets:     ~120 KB
Shared Modules:              ~85 KB
Dependencies:
  - React/Next.js:           ~45 KB
  - Tailwind CSS:            ~35 KB
  - shadcn/ui:               ~25 KB
  - Date/Utilities:          ~15 KB
  - Other:                   ~25 KB
```

---

## 5. Caching Strategy

### HTTP Headers

```
# Static assets (images, CSS, JS)
Cache-Control: public, max-age=31536000, immutable

# HTML pages
Cache-Control: public, max-age=3600, s-maxage=86400

# API responses
Cache-Control: private, max-age=300
```

### Client-side Caching

```typescript
// ✅ Cache API responses
const cache = new Map();

async function fetchWithCache(key, fn) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const data = await fn();
  cache.set(key, data);
  
  // Invalidate after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);
  
  return data;
}
```

---

## 6. Monitoring & Tracking

### Web Vitals Monitoring

```typescript
// In app/layout.tsx
import { useReportWebVitals } from 'next/web-vitals';

function reportWebVitals(metric) {
  // Send to analytics service (Sentry, New Relic, etc.)
  console.log(metric);
}
```

### Lighthouse CI Integration

```bash
# Run Lighthouse CI on every commit
npm install -g @lhci/cli@0.9.x

# In .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v8
  with:
    uploadArtifacts: true
    configPath: './lighthouserc.json'
```

---

## 7. Performance Targets by Page

| Page | LCP | FID | CLS | Size |
|------|-----|-----|-----|------|
| Dashboard | < 2.5s | < 100ms | < 0.1 | ~150 KB |
| Obras List | < 2.0s | < 80ms | < 0.08 | ~120 KB |
| Credit Simulator | < 2.3s | < 90ms | < 0.1 | ~140 KB |
| Profile | < 1.8s | < 60ms | < 0.05 | ~80 KB |
| Login | < 1.5s | < 50ms | < 0.03 | ~60 KB |

---

## 8. Database Query Optimization

### Pagination

```typescript
// Always paginate lists
async function listObras(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const obras = await db.obra.findMany({
    skip: offset,
    take: limit,
    include: { credito: true, etapas: true },
  });
  
  return { obras, total: await db.obra.count(), page, limit };
}
```

### Indexing

```sql
-- Critical indexes
CREATE INDEX idx_usuario_id ON obra(usuario_id);
CREATE INDEX idx_credito_usuario ON credito(usuario_id);
CREATE INDEX idx_obra_status ON obra(status);
CREATE INDEX idx_etapa_obra ON etapa(obra_id);
```

### N+1 Query Prevention

```typescript
// ❌ Bad: N+1 queries
const obras = await db.obra.findMany();
for (const obra of obras) {
  obra.credito = await db.credito.findFirst({ where: { obra_id: obra.id } });
}

// ✅ Good: Single query with includes
const obras = await db.obra.findMany({
  include: { credito: true },
});
```

---

## 9. API Performance

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### Response Compression

```typescript
import compression from 'compression';

app.use(compression()); // Gzip compression
```

### Async Processing

```typescript
// ❌ Slow: Wait for everything
app.post('/credito/solicitar', async (req, res) => {
  const credito = await createCredit(req.body);
  await sendEmail(credito.usuarioEmail);  // Wait for email
  res.json(credito);
});

// ✅ Fast: Use job queue for async tasks
app.post('/credito/solicitar', async (req, res) => {
  const credito = await createCredit(req.body);
  queue.add('send-email', { email: credito.usuarioEmail });  // Fire and forget
  res.json(credito);
});
```

---

## 10. Frontend Checklist for Launch

### Lighthouse Audit (target > 80 on all metrics)

- [ ] Run `npm run build && npm run audit`
- [ ] Fix Critical issues
- [ ] Fix High priority issues
- [ ] Document Medium issues

### Bundle Size

- [ ] Total JS < 250 KB (gzipped < 65 KB)
- [ ] Total CSS < 180 KB (gzipped < 35 KB)
- [ ] No unused dependencies
- [ ] Code splitting implemented

### Images

- [ ] All images use Next.js Image component
- [ ] WEBP format for modern browsers
- [ ] Blur placeholder for lazy-loaded images
- [ ] Proper sizing for responsive design

### Fonts

- [ ] System fonts or Google Fonts with font-display: swap
- [ ] No Web Font Loader bloat
- [ ] Preload critical fonts

### JavaScript

- [ ] No console errors/warnings in production
- [ ] Minified and tree-shaken
- [ ] No blocking scripts
- [ ] Dynamic imports for code splitting

### CSS

- [ ] Only Tailwind CSS used (no additional CSS frameworks)
- [ ] No unused styles
- [ ] Critical CSS inlined
- [ ] Gzip compression enabled

---

## Performance Testing

### Local Testing

```bash
# Build and analyze
pnpm build
npx next start

# Open Lighthouse in Chrome DevTools
# DevTools → Lighthouse → Generate Report
```

### Production Testing

```bash
# Use real user monitoring
# Google PageSpeed Insights: https://pagespeed.web.dev
# WebPageTest: https://www.webpagetest.org
```

---

## Resources

- [Next.js Performance Guide](https://nextjs.org/learn/seo/performance)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Bundle Analyzer](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer)
- [Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)

---

## Status & Timeline

| Task | Status | Target |
|------|--------|--------|
| Bundle size optimization | ⏳ In Progress | This week |
| Image optimization | ⏳ In Progress | This week |
| Code splitting | ⏳ In Progress | Next week |
| Caching strategy | ⏳ Planning | Next week |
| Lighthouse audit | ⏳ In Progress | Before launch |
| Production deployment | ⏳ Ready | End of month |

---

**Last Updated**: June 23, 2026  
**Target Launch**: July 15, 2026  
**Current Status**: ~75% Complete
