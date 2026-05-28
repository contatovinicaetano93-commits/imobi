# Sentry Setup Guide - imobi Post-Deployment

This document provides step-by-step instructions for setting up Sentry error monitoring for the imobi application.

**Date**: 2026-05-28  
**Status**: Ready for configuration

---

## Overview

Sentry is an error tracking and monitoring platform that will help us capture, track, and fix crashes in both the API (NestJS) and Web (Next.js) applications.

### What Gets Tracked
- API errors (5xx, 4xx, exceptions)
- JavaScript errors in web application
- Performance issues and slow endpoints
- User feedback and session replay (future)

---

## Task 1: Create Sentry Organization and Projects

### Step 1.1: Create Sentry Account (if not exists)

1. Go to: **https://sentry.io/signup**
2. Choose your signup method:
   - Email
   - GitHub
   - Microsoft
3. Complete registration form:
   - Email: `contato.vinicaetano93@gmail.com`
   - Company: `imobi`
   - Name: Your name
4. Verify email
5. Create organization:
   - Organization name: `imobi`
   - URL slug: `imobi`

### Step 1.2: Create API Project (NestJS/Node.js)

1. In Sentry dashboard, go to: **Projects** → **+ Create Project**
2. Fill in project details:
   - **Project name**: `imobi-api`
   - **Team**: Select your team or create new
   - **Alert Rule Frequency**: Default
   - **Data Scrubbing**: Enable (remove sensitive data)
3. **Select Platform**: Choose **Node.js**
4. **Select Framework**: Choose **Nest.js**
5. Click **Create Project**

**Sentry will provide**:
- **DSN (Data Source Name)**: Copy this!
  - Format: `https://examplePublicKey@o1234567.ingest.sentry.io/1234567`
- Installation code (we'll configure this separately)

**Save this DSN**: `SENTRY_DSN_API = <paste-here>`

### Step 1.3: Create Web Project (JavaScript/Next.js)

1. Go back to Projects → **+ Create Project**
2. Fill in project details:
   - **Project name**: `imobi-web`
   - **Team**: Same team as API
   - **Alert Rule Frequency**: Default
   - **Data Scrubbing**: Enable
3. **Select Platform**: Choose **JavaScript**
4. **Select Framework**: Choose **Next.js**
5. Click **Create Project**

**Sentry will provide**:
- **DSN (Data Source Name)**: Copy this!
  - Format: `https://examplePublicKey@o1234567.ingest.sentry.io/1234567`

**Save this DSN**: `SENTRY_DSN_WEB = <paste-here>`

---

## Task 2: Configure Sentry Integrations

### Step 2.1: API (NestJS) Configuration

#### Install Sentry Package

```bash
cd /home/user/imobi/services/api
npm install @sentry/nestjs @sentry/tracing
# or with pnpm (preferred in this project)
pnpm add @sentry/nestjs @sentry/tracing
```

#### Add Sentry to API Main Module

Update `/home/user/imobi/services/api/src/main.ts`:

```typescript
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

async function bootstrap() {
  // Initialize Sentry BEFORE creating app
  Sentry.init({
    dsn: process.env.SENTRY_DSN_API,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [
      nodeProfilingIntegration(),
      // ... other integrations
    ],
    // Scrub sensitive data
    beforeSend(event, hint) {
      // Remove passwords, tokens from events
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["x-api-key"];
      }
      return event;
    },
  });

  const app = await NestFactory.create(AppModule);
  
  // Use Sentry middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());

  // ... rest of configuration
  await app.listen(process.env.PORT || 3000);
}

bootstrap().catch((error) => {
  console.error("Fatal error during bootstrap:", error);
  process.exit(1);
});
```

#### Add Sentry Filter for NestJS Exceptions

Create `/home/user/imobi/services/api/src/common/sentry.filter.ts`:

```typescript
import { Catch, HttpException } from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";

@Catch()
export class SentryExceptionFilter {
  catch(exception: Error) {
    Sentry.captureException(exception);
  }
}
```

Register in `app.module.ts`:
```typescript
import { SentryExceptionFilter } from './common/sentry.filter';

@Module({
  // ...
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
  ],
})
export class AppModule {}
```

### Step 2.2: Web (Next.js) Configuration

#### Install Sentry Package

```bash
cd /home/user/imobi/apps/web
npm install @sentry/nextjs
# or
pnpm add @sentry/nextjs
```

#### Create Sentry Configuration

Create `/home/user/imobi/apps/web/sentry.config.js`:

```javascript
const Sentry = require("@sentry/nextjs");

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN_WEB;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
    // Set sample rate for transactions in production
    tracesSampleRate:
      process.env.NEXT_PUBLIC_ENVIRONMENT === "production" ? 0.1 : 1.0,
    // Set sample rate for replays
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Debug in development
    debug: process.env.NEXT_PUBLIC_ENVIRONMENT !== "production",
  });
}
```

#### Update Next.js Config

Update `/home/user/imobi/apps/web/next.config.js`:

```javascript
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  // ... existing config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry options
    org: "imobi", // Replace with your Sentry org
    project: "imobi-web",
    authToken: process.env.SENTRY_AUTH_TOKEN, // Set this in CI/CD
    silent: true,
    widenClientFileUpload: true,
    reactComponentAnnotation: {
      enabled: true,
    },
  }
);
```

#### Add Error Boundary in Layout

Update `/home/user/imobi/apps/web/app/layout.tsx` or create error boundary:

```typescript
import * as Sentry from "@sentry/nextjs";

export const ErrorBoundary = Sentry.errorBoundaryWithShowDialog({
  showDialog: true,
  title: "Oops! Erro na aplicação",
  subtitle: "Nosso time foi notificado.",
  labelComments: "Conte-nos o que aconteceu",
});
```

---

## Task 3: Environment Variables

### Add to `.env.production`

```bash
# Sentry Configuration - API
SENTRY_DSN_API=https://YOUR_API_PUBLIC_KEY@o1234567.ingest.sentry.io/1234567
SENTRY_ENVIRONMENT=production
SENTRY_TRACE_SAMPLE_RATE=0.1
SENTRY_PROFILE_SAMPLE_RATE=0.1

# Sentry Configuration - Web
NEXT_PUBLIC_SENTRY_DSN_WEB=https://YOUR_WEB_PUBLIC_KEY@o1234567.ingest.sentry.io/2234567
NEXT_PUBLIC_ENVIRONMENT=production

# For CI/CD (if releasing source maps)
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=imobi
SENTRY_PROJECT_API=imobi-api
SENTRY_PROJECT_WEB=imobi-web
```

### Add to `.env.example` (WITHOUT actual keys)

```bash
# Sentry Configuration
SENTRY_DSN_API=https://your_api_key@o000000.ingest.sentry.io/000000
NEXT_PUBLIC_SENTRY_DSN_WEB=https://your_web_key@o000000.ingest.sentry.io/000000
SENTRY_ENVIRONMENT=production
SENTRY_AUTH_TOKEN=
```

---

## Task 4: Configure Sentry Project Settings

### API Project Settings (imobi-api)

1. Go to **Projects** → **imobi-api** → **Settings**

2. **Alert Rules**:
   - Go to **Alerts** → **Create Alert Rule**
   - When: New events in {project}
   - If: Errors (or specific severity)
   - Then: Send notification to `#alerts` or email

3. **Integrations**:
   - Enable **Slack** (if using)
   - Enable **GitHub** (for source context)

4. **Data Scrubbing** (Security):
   - Go to **Settings** → **Security & Privacy**
   - Enable: Data Scrubbing
   - PII stripping: ON
   - Sensitive field names: add custom patterns

### Web Project Settings (imobi-web)

1. Go to **Projects** → **imobi-web** → **Settings**

2. **Performance Monitoring**:
   - Go to **Performance**
   - Enable **Performance Monitoring**
   - Set thresholds for slow transactions

3. **Release Tracking**:
   - Go to **Settings** → **General**
   - Enable automatic release creation

---

## Task 5: Test Sentry Integration

### Test API (NestJS)

After deploying with Sentry configured, trigger a test error:

```bash
# Via API endpoint (you'll need to create a test endpoint)
curl -X GET https://api.imobi.com.br/test-sentry-error

# Or via code:
// In any controller
throw new Error("Test Sentry error from API");
```

**Verify in Sentry**:
1. Go to **imobi-api** project
2. Check **Issues** page
3. You should see the test error appear within 5 minutes

### Test Web (Next.js)

In the web app, trigger a test error:

```typescript
// In a component
<button onClick={() => {
  throw new Error("Test Sentry error from Web");
}}>
  Test Error
</button>
```

**Verify in Sentry**:
1. Go to **imobi-web** project
2. Check **Issues** page
3. You should see the test error appear

---

## Task 6: Deploy Configuration

### Docker / Production Deployment

Ensure environment variables are set in your deployment platform:

**For AWS ECS/Fargate**:
1. Go to Task Definition
2. Add environment variables:
   - `SENTRY_DSN_API`
   - `SENTRY_ENVIRONMENT`

**For Kubernetes**:
1. Update ConfigMap with Sentry settings
2. Or use Secrets for sensitive values

**For GitHub Actions CI/CD**:
```yaml
env:
  SENTRY_DSN_API: ${{ secrets.SENTRY_DSN_API }}
  NEXT_PUBLIC_SENTRY_DSN_WEB: ${{ secrets.SENTRY_DSN_WEB }}
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

---

## Useful Sentry Commands

### Release Tracking (Optional but Recommended)

Create a release when deploying:

```bash
# API release
sentry-cli releases -o imobi -p imobi-api create "1.0.0"
sentry-cli releases -o imobi -p imobi-api files upload-sourcemaps ./dist

# Web release
sentry-cli releases -o imobi -p imobi-web create "1.0.0"
sentry-cli releases -o imobi -p imobi-web files upload-sourcemaps ./.next/static
```

### Source Maps

Ensure source maps are uploaded for better stack traces:

```bash
# Install sentry-cli
npm install -g @sentry/cli

# Authenticate
sentry-cli login

# Upload maps
sentry-cli releases files upload-sourcemaps ./path/to/build/dir
```

---

## Monitoring Dashboard

After setup, use Sentry to:

1. **Monitor Error Rates**
   - Go to **Dashboard**
   - Add chart: "Errors over time"

2. **Track Release Health**
   - Go to **Releases**
   - See error rate per release
   - Monitor adoption

3. **Performance Monitoring**
   - Go to **Performance**
   - Identify slow endpoints
   - Check database query times

4. **User Impact**
   - See how many users affected
   - Track error trends
   - Get context on crashes

---

## Documentation & Support

- **Sentry Docs**: https://docs.sentry.io/
- **NestJS Integration**: https://docs.sentry.io/platforms/node/guides/nest/
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## Checklist

- [ ] Sentry organization created
- [ ] `imobi-api` project created → DSN copied
- [ ] `imobi-web` project created → DSN copied
- [ ] `@sentry/nestjs` installed in API
- [ ] Sentry initialized in API main.ts
- [ ] `@sentry/nextjs` installed in Web
- [ ] Sentry configured in Next.js
- [ ] Environment variables set in `.env.production`
- [ ] Alerts configured in Sentry
- [ ] Integrations enabled (Slack, GitHub)
- [ ] Test error triggered and verified in both projects
- [ ] Source maps uploading (if applicable)
- [ ] Performance monitoring enabled

---

## DSN Reference

**Keep these safe - do not commit to version control:**

```
SENTRY_DSN_API: [PASTE YOUR API DSN HERE]
SENTRY_DSN_WEB: [PASTE YOUR WEB DSN HERE]
```

Store in:
- `.env.production` (with actual values)
- CI/CD secrets (GitHub, GitLab, etc.)
- Infrastructure (ECS, K8s, etc.)

---

**Setup Date**: 2026-05-28  
**Status**: Ready for implementation
