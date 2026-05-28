# Sentry Error Tracking Setup Guide

**Last Updated**: 2026-05-28  
**Scope**: Production error tracking for imbobi Web + API

---

## Overview

Sentry is a real-time error tracking platform that captures and organizes application exceptions, providing stack traces, environment context, and user feedback.

### Key Features

- **Error Grouping**: Automatically groups similar errors
- **Source Maps**: Maps minified code to original source
- **Release Tracking**: Links errors to specific deployments
- **Performance Monitoring**: Traces slow transactions
- **User Feedback**: Captures user context with errors
- **Alerts**: Sends notifications to Slack, email, etc.

### Setup Time: ~25 minutes

---

## Part 1: Account Setup

### 1.1 Create Sentry Organization

1. Go to https://sentry.io/
2. Click **Sign Up**
3. Use email: `contato.vinicaetano93@gmail.com`
4. Create password (store in password manager)
5. Verify email address

### 1.2 Create Organization

1. After signup, choose **Create Organization**
2. Organization name: `imbobi`
3. Accept terms and continue
4. Select pricing plan: **Free** tier (5,000 events/month included)

---

## Part 2: Web App Setup (Next.js)

### 2.1 Create Sentry Project for Web

1. In Sentry dashboard, click **Projects**
2. Click **Create Project**
3. **Platform**: Select `JavaScript - Next.js`
4. **Project name**: `imbobi-web`
5. **Alert frequency**: `Default (immediate)`
6. Click **Create Project**

### 2.2 Install Sentry in Next.js

```bash
cd /home/user/alagami-site/apps/web
pnpm add @sentry/nextjs
```

### 2.3 Configure Sentry

#### Step 1: Copy DSN from Sentry

1. In Sentry project page, look for **DSN** (Data Source Name)
2. Format: `https://[key]@[domain].ingest.sentry.io/[projectId]`
3. Copy for use in environment variables

#### Step 2: Create `sentry.config.ts`

Create `/home/user/alagami-site/apps/web/sentry.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

export const initSentry = () => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn("Sentry DSN not configured");
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Session tracking
    attachStacktrace: true,
    maxBreadcrumbs: 50,
    
    // Release tracking (from git commit SHA)
    release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
    
    // Integrations
    integrations: [
      new Sentry.Replay({
        // Mask sensitive text in replays
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
      
      new Sentry.HttpClientIntegration({
        failedRequestStatusCodes: [400, 401, 403, 404, 500, 502, 503, 504],
      }),
    ],
    
    // Session replay settings
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Ignored errors
    ignoreErrors: [
      // Ignore browser extensions
      "top.GLOBALS",
      // Ignore errors from other scripts
      "originalCreateNotification",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      // Ignore ResizeObserver errors (common and harmless)
      "ResizeObserver loop limit exceeded",
    ],
  });
};
```

#### Step 3: Update `next.config.js`

Update `/home/user/alagami-site/apps/web/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  transpilePackages: ["@imbobi/core", "@imbobi/schemas", "@imbobi/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: "imbobi",
  project: "imbobi-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true, // Don't expose source maps publicly
  silent: false, // Show Sentry build output
  disableLogger: true, // Disable Sentry logger in production
});
```

#### Step 4: Initialize in `app/layout.tsx`

Add to your root layout component:

```typescript
import "./globals.css";
import { initSentry } from "@/sentry.config";

// Initialize Sentry on app start
if (typeof window === "undefined") {
  initSentry();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

#### Step 5: Create Test Route

Create `/home/user/alagami-site/apps/web/app/test-sentry/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

export default function TestSentryPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTestError = () => {
    setIsLoading(true);
    try {
      throw new Error("This is a test error from Sentry");
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          testing: "true",
        },
        contexts: {
          test: {
            type: "manual-test",
            timestamp: new Date().toISOString(),
          },
        },
      });
      alert("Error sent to Sentry!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrash = async () => {
    // This will cause an unhandled error
    throw new Error("Intentional crash test");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Sentry Error Testing</h1>
      <p>
        Use this page to verify Sentry is working in production. Do NOT commit
        this file to production without protection.
      </p>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={handleTestError}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          {isLoading ? "Sending..." : "Test Error (Caught)"}
        </button>

        <button
          onClick={handleCrash}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Test Error (Uncaught)
        </button>
      </div>

      <p style={{ marginTop: "20px", color: "#666", fontSize: "14px" }}>
        Check Sentry dashboard after clicking buttons:
        <br />
        https://sentry.io/organizations/imbobi/issues/
      </p>
    </div>
  );
}
```

### 2.4 Add Environment Variables to Vercel

1. Go to https://vercel.com/dashboard
2. Select project: **alagami-site**
3. **Settings** → **Environment Variables**
4. Add variables:

```
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[domain].ingest.sentry.io/[projectId]
SENTRY_DSN=https://[key]:[secret]@[domain].ingest.sentry.io/[projectId]
SENTRY_AUTH_TOKEN=[auth-token-from-sentry-settings]
NEXT_PUBLIC_APP_VERSION=1.0.0
```

#### Get Sentry Auth Token

1. In Sentry, go to **Settings** → **Auth Tokens**
2. Click **Create New Token**
3. Name: `vercel-sentry`
4. Scopes: `project:releases`, `org:read`
5. Copy token

### 2.5 Deploy and Test

1. Push changes to GitHub (this triggers Vercel deployment)
2. Wait for deployment to complete
3. Once deployed, visit: `https://alagami-site.vercel.app/test-sentry`
4. Click test button
5. Check Sentry dashboard: https://sentry.io/organizations/imbobi/projects/imbobi-web/
6. Verify error appears within 10 seconds

---

## Part 3: API Setup (NestJS)

### 3.1 Create Sentry Project for API

1. In Sentry dashboard, click **Projects**
2. Click **Create Project**
3. **Platform**: Select `Node.js`
4. **Project name**: `imbobi-api`
5. Click **Create Project**
6. Copy **DSN**

### 3.2 Install Sentry in NestJS

```bash
cd /home/user/alagami-site/services/api
pnpm add @sentry/node @sentry/tracing
```

### 3.3 Configure Sentry Middleware

Create `/home/user/alagami-site/services/api/src/common/sentry.middleware.ts`:

```typescript
import * as Sentry from "@sentry/node";
import { Injectable, NestMiddleware } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";

@Injectable()
export class SentryMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    // Set user context if authenticated
    if (req.user?.id) {
      Sentry.setUser({
        id: req.user.id,
        email: req.user.email,
        ip_address: req.ip,
      });
    }

    // Capture request context
    Sentry.setContext("request", {
      method: req.method,
      path: req.url,
      query: req.query,
    });

    next();
  }
}
```

### 3.4 Initialize in `main.ts`

Update `/home/user/alagami-site/services/api/src/main.ts`:

```typescript
import * as Sentry from "@sentry/node";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  // Initialize Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      
      integrations: [
        // Capture HTTP errors
        new Sentry.Integrations.Http({ tracing: true }),
        // Capture database query errors
        new Sentry.Integrations.Postgres({ usePatchAll: true }),
      ],
    });
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== "production",
    })
  );

  // Use Sentry error handler
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());

  const port = process.env.PORT || 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
```

### 3.5 Add Global Exception Filter

Create `/home/user/alagami-site/services/api/src/common/sentry.filter.ts`:

```typescript
import * as Sentry from "@sentry/node";
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
    }

    // Capture error in Sentry
    Sentry.captureException(exception, {
      tags: {
        module: request.url,
        method: request.method,
      },
      contexts: {
        http: {
          method: request.method,
          url: request.url,
          status_code: status,
        },
      },
    });

    response.status(status).json({
      statusCode: status,
      message: exception instanceof Error ? exception.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 3.6 Register in App Module

Update `/home/user/alagami-site/services/api/src/app.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { SentryExceptionFilter } from "./common/sentry.filter";

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule {}
```

### 3.7 Add Environment Variables to Render

1. Go to https://dashboard.render.com/
2. Select service: **alagami-api**
3. **Settings** → **Environment**
4. Add: `SENTRY_DSN=https://[key]:[secret]@[domain].ingest.sentry.io/[projectId]`

### 3.8 Deploy and Verify

1. Push changes to GitHub
2. Render automatically deploys
3. After 2-3 minutes, trigger a test error:
   ```bash
   curl https://api.imbobi.com.br/api/v1/health
   ```
4. Check Sentry: https://sentry.io/organizations/imbobi/projects/imbobi-api/

---

## Part 4: Release Tracking

### 4.1 Automatic Release Detection

Sentry can automatically track releases using git commits:

#### Update `.env.production`

```bash
NEXT_PUBLIC_APP_VERSION=1.0.0
SENTRY_RELEASE=1.0.0
```

#### In GitHub Actions (if using CI/CD)

```yaml
- name: Create Sentry Release
  run: |
    pnpm dlx @sentry/cli releases create \
      -o imbobi \
      -p imbobi-web \
      ${{ github.sha }}
```

### 4.2 View Release in Sentry

1. Go to **Settings** → **Releases**
2. Each deployment appears as a new release
3. Errors are grouped by release
4. Compare error rates between versions

---

## Part 5: Alerts & Notifications

### 5.1 Email Alerts

1. Go to **Alerts** (top menu)
2. Click **Create Alert Rule**
3. Configure:
   ```
   Filter: All environments
   Condition: An issue is seen 10+ times in 1 hour
   Action: Send email to contato.vinicaetano93@gmail.com
   ```
4. Repeat for:
   - First error in production
   - Error rate > 5%
   - New issue detection

### 5.2 Slack Integration

#### Step 1: Add Slack Workspace to Sentry

1. **Settings** → **Integrations**
2. Search for **Slack**
3. Click **Install**
4. Authorize Sentry to access your Slack workspace
5. Select channel: `#alerts` (create if needed)

#### Step 2: Create Slack Alert Rule

1. **Alerts** → **Create Alert Rule**
2. Configure:
   ```
   Filter: environment:production
   Condition: An issue is seen 5+ times in 10 minutes
   Action: Send to Slack #alerts
   ```

---

## Part 6: Error Grouping & Rules

### 6.1 Configure Error Grouping

Sentry groups similar errors automatically, but you can customize:

1. **Settings** → **Error Grouping**
2. Review and adjust grouping rules:
   - Stack trace similarity
   - Message matching
   - Custom grouping by title/fingerprint

### 6.2 Inbound Filters

Hide noisy or irrelevant errors:

1. **Settings** → **Inbound Filters**
2. Click **Add Filter**
3. Examples:
   - **Browser Extension Errors**: `top.GLOBALS`
   - **Third-party Scripts**: `errorHandler`
   - **Client-side Spam**: `ResizeObserver loop`

### 6.3 Custom Fingerprinting

For complex error grouping, add to Sentry.init():

```typescript
beforeSend(event, hint) {
  // Group by custom logic
  if (event.exception) {
    const error = hint.originalException;
    if (error instanceof ValidationError) {
      event.fingerprint = ["validation", error.field];
    }
  }
  return event;
},
```

---

## Part 7: Performance Monitoring

### 7.1 Track Transactions

Sentry can track slow API routes and client-side operations:

#### Enable Performance Monitoring in API

```typescript
// In Sentry.init() - already enabled with tracesSampleRate
tracesSampleRate: 0.1, // 10% of transactions
integrations: [
  new Sentry.Integrations.Http({ tracing: true }),
],
```

#### Enable Performance Monitoring in Web

```typescript
// In sentry.config.ts - already enabled
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
```

### 7.2 View Performance Issues

1. Go to **Performance** tab in Sentry
2. View:
   - Slowest transactions
   - Most-called operations
   - Error correlations
3. Create alerts for slow operations > 500ms

---

## Part 8: User Feedback & Context

### 8.1 Capture User Feedback

Add to error handling:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // Some operation
} catch (error) {
  Sentry.captureException(error);
  
  // Show feedback form
  Sentry.showReportDialog({
    eventId: lastEventId,
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    title: "Ocorreu um erro",
    subtitle: "Nosso time foi notificado. Descreva o que aconteceu:",
    labelComments: "O que você estava fazendo quando o erro ocorreu?",
    labelClose: "Fechar",
    labelSubmit: "Enviar",
    onClose: () => {
      window.location.reload();
    },
  });
}
```

### 8.2 Add User Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
  ip_address: ip,
});
```

---

## Part 9: Verification Checklist

### Web (Next.js)

- [ ] Sentry project created: `imbobi-web`
- [ ] DSN copied from Sentry
- [ ] `@sentry/nextjs` installed
- [ ] `sentry.config.ts` created
- [ ] `next.config.js` updated with `withSentryConfig`
- [ ] Environment variables set in Vercel
- [ ] Deployed to Vercel
- [ ] Test page works: `/test-sentry`
- [ ] Error appears in Sentry dashboard within 10 seconds
- [ ] Source maps working (click error to see code)
- [ ] Release tracking shows version

### API (NestJS)

- [ ] Sentry project created: `imbobi-api`
- [ ] DSN copied from Sentry
- [ ] `@sentry/node` installed
- [ ] `Sentry.init()` in `main.ts`
- [ ] Exception filter registered
- [ ] Environment variables set in Render
- [ ] Deployed to Render
- [ ] Error appears in Sentry dashboard
- [ ] Stack traces show original code (not minified)
- [ ] Performance monitoring shows slow queries

### Alerts

- [ ] Slack workspace integrated
- [ ] Alert rule created for critical errors
- [ ] Test alert sent to Slack
- [ ] Email alerts configured
- [ ] Release tracking enabled

---

## Part 10: Troubleshooting

### Errors Not Appearing in Sentry

**Problem**: No data in Sentry dashboard

**Solutions**:
1. Verify DSN is correct: `echo $SENTRY_DSN`
2. Check environment variables in Vercel/Render
3. Wait 10-30 seconds after error occurs
4. Check browser console for errors (if web)
5. Verify firewall allows https://sentry.io
6. Test manually: `Sentry.captureException(new Error("test"))`

### Source Maps Not Working

**Problem**: Stack traces show minified code

**Solutions**:
1. Ensure `hideSourceMaps: true` is set (production only)
2. Verify `SENTRY_AUTH_TOKEN` is correct in Vercel
3. Check Sentry project settings: **Settings** → **Source Maps**
4. Ensure release name matches between build and Sentry

### Too Many Events (Cost)

**Problem**: Exceeding free tier (5,000 events/month)

**Solutions**:
1. Increase `tracesSampleRate`: Change from `1.0` to `0.1`
2. Add inbound filters to exclude noise
3. Update `beforeSend` to filter spam errors
4. Set error budget: Review and delete low-priority errors

### Release Not Tracking Correctly

**Problem**: Errors not grouped by release

**Solutions**:
1. Set `SENTRY_RELEASE` environment variable
2. Verify release name format: `semver` (e.g., `1.0.0`)
3. Check **Settings** → **Releases** in Sentry
4. Ensure commit SHA matches CI/CD

---

## Part 11: Dashboard Reference

### Key Sentry URLs

| Page | URL | Purpose |
|------|-----|---------|
| **Issues** | https://sentry.io/organizations/imbobi/issues/ | View all errors |
| **Web Project** | https://sentry.io/organizations/imbobi/projects/imbobi-web/ | Frontend errors |
| **API Project** | https://sentry.io/organizations/imbobi/projects/imbobi-api/ | Backend errors |
| **Performance** | https://sentry.io/organizations/imbobi/performance/ | Slow operations |
| **Releases** | https://sentry.io/organizations/imbobi/releases/ | Deployment tracking |
| **Alerts** | https://sentry.io/organizations/imbobi/alerts/ | Alert rules |

---

## References

- Sentry Documentation: https://docs.sentry.io/
- Sentry Next.js Setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry NestJS Setup: https://docs.sentry.io/platforms/node/guides/nestjs/
- Source Maps Guide: https://docs.sentry.io/product/cli/releases/#source-maps
- Performance Monitoring: https://docs.sentry.io/product/performance/

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-28  
**Next Review**: 2026-06-28
