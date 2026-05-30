# Vercel Environment Variables Configuration - Step by Step

## Overview

This guide walks you through configuring all environment variables needed for imobi to deploy successfully on Vercel. Follow each step carefully to avoid deployment failures.

**Time Required**: 10-15 minutes  
**Difficulty**: Beginner  
**Prerequisites**: Access to Vercel Dashboard, all secret values from your production infrastructure

---

## Part 1: Access Vercel Dashboard

### Step 1.1: Open Vercel Dashboard
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Log in with your account (likely using GitHub)
3. You should see your projects listed

### Step 1.2: Select the imobi Project
1. Look for project named **`imobi-web`** or **`imobi`**
2. Click on it to open the project settings

### Step 1.3: Navigate to Environment Variables
1. Once in the project, look for the **Settings** tab in the top navigation
2. Click **Settings**
3. In the left sidebar, click **Environment Variables**
4. You should now see the "Environment Variables" configuration page

---

## Part 2: Configure All Variables

### CRITICAL: Secret vs Public Variables

When adding variables, you'll see two checkboxes:
- **Encrypted** (or "Secret") — Check this for sensitive data (API keys, passwords, connection strings)
- **Scope** — Choose which environments get the variable (Production, Preview, Development)

**Rule of thumb**: Variables starting with `NEXT_PUBLIC_` are safe to expose in client code. All others should be marked as Secret.

---

## Variable Configuration Checklist

### Database Configuration

#### Variable: `DATABASE_URL`
```
Scope: Production, Preview, Development
Type: Secret (CHECKED) ✓
Value: postgresql://user:password@host:5432/imobi_prod
```

**How to find this value:**
- From your database provider (Railway, Supabase, AWS RDS, etc.)
- Format: `postgresql://[user]:[password]@[host]:[port]/[database_name]`

**Steps:**
1. Click the **Add** button next to "Environment Variables"
2. Name: `DATABASE_URL`
3. Value: Paste your PostgreSQL connection string
4. Check **Encrypted** checkbox
5. Scopes: Select all (Production, Preview, Development)
6. Click **Add** to save

---

### Sentry Configuration (Error Tracking)

#### Variable: `NEXT_PUBLIC_SENTRY_DSN`
```
Scope: Production, Preview, Development
Type: Public (NOT encrypted)
Value: https://your_key@sentry.io/your_project_id
```

**How to find this value:**
- Log in to [https://sentry.io](https://sentry.io)
- Navigate to your project
- Click **Settings → Client Keys (DSN)**
- Copy the full DSN URL

**Steps:**
1. Click the **Add** button
2. Name: `NEXT_PUBLIC_SENTRY_DSN`
3. Value: Paste your Sentry DSN
4. DO NOT check **Encrypted** (this is public)
5. Scopes: Select all
6. Click **Add** to save

---

### AWS S3 Configuration (File Storage)

#### Variable 1: `AWS_REGION`
```
Scope: Production, Preview, Development
Type: Public (NOT encrypted)
Value: us-east-1
```

**Steps:**
1. Click the **Add** button
2. Name: `AWS_REGION`
3. Value: `us-east-1` (or your AWS region)
4. DO NOT check **Encrypted**
5. Scopes: Select all
6. Click **Add** to save

#### Variable 2: `AWS_ACCESS_KEY_ID`
```
Scope: Production, Preview, Development
Type: Secret (CHECKED) ✓
Value: AKIA...
```

**How to find this value:**
- Log in to AWS Console
- Go to IAM → Users → Your User
- Click **Security credentials** tab
- Under "Access keys", click **Create access key**
- Copy the Access Key ID

**Steps:**
1. Click the **Add** button
2. Name: `AWS_ACCESS_KEY_ID`
3. Value: Paste your AWS access key ID
4. Check **Encrypted** checkbox
5. Scopes: Select all
6. Click **Add** to save

#### Variable 3: `AWS_SECRET_ACCESS_KEY`
```
Scope: Production, Preview, Development
Type: Secret (CHECKED) ✓
Value: aws_secret_...
```

**How to find this value:**
- Same location as above (IAM → Users → Your User → Security credentials)
- This is shown ONLY once when you create the access key
- If you lost it, delete the old key and create a new one

**Steps:**
1. Click the **Add** button
2. Name: `AWS_SECRET_ACCESS_KEY`
3. Value: Paste your AWS secret access key
4. Check **Encrypted** checkbox
5. Scopes: Select all
6. Click **Add** to save

#### Variable 4: `AWS_S3_BUCKET`
```
Scope: Production, Preview, Development
Type: Public (NOT encrypted)
Value: imobi-prod-uploads
```

**How to find this value:**
- Log in to AWS S3 Console
- Look at your bucket names
- Use the production bucket name (usually contains "prod" or "production")

**Steps:**
1. Click the **Add** button
2. Name: `AWS_S3_BUCKET`
3. Value: Your S3 bucket name (e.g., `imobi-prod-uploads`)
4. DO NOT check **Encrypted**
5. Scopes: Select all
6. Click **Add** to save

---

### SendGrid Configuration (Email Service)

#### Variable: `SENDGRID_API_KEY`
```
Scope: Production, Preview, Development
Type: Secret (CHECKED) ✓
Value: SG.xxxxxxxxxxx...
```

**How to find this value:**
- Log in to [https://sendgrid.com](https://sendgrid.com)
- Navigate to **Settings → API Keys**
- Click **Create API Key**
- Choose "Restricted Access"
- Enable: Mail Send, Read Mail Send
- Copy the key (shown only once)

**Steps:**
1. Click the **Add** button
2. Name: `SENDGRID_API_KEY`
3. Value: Paste your SendGrid API key
4. Check **Encrypted** checkbox
5. Scopes: Select all
6. Click **Add** to save

---

### Redis Configuration (Caching & Queues)

#### Variable: `REDIS_URL`
```
Scope: Production, Preview, Development
Type: Secret (CHECKED) ✓
Value: redis://:password@host:6379
```

**How to find this value:**
- From your Redis provider (Upstash, Redis Labs, AWS ElastiCache, etc.)
- Format: `redis://:[password]@[host]:[port]` or `redis://:[password]@[host]:[port]/[db_number]`
- Include the colon before the password, even if password is empty: `redis://:@host:6379`

**Steps:**
1. Click the **Add** button
2. Name: `REDIS_URL`
3. Value: Paste your Redis connection URL
4. Check **Encrypted** checkbox
5. Scopes: Select all
6. Click **Add** to save

---

### Application Configuration

#### Variable 1: `NEXT_PUBLIC_API_URL`
```
Scope: Production, Preview, Development
Type: Public (NOT encrypted)
Value: https://api.imobi.com
```

**How to find this value:**
- Your NestJS API deployment URL
- For production: typically your API domain (e.g., `https://api.imobi.com`)
- For preview: typically `https://api-staging.imobi.com` or `https://api-preview.imobi.com`

**Steps:**
1. Click the **Add** button
2. Name: `NEXT_PUBLIC_API_URL`
3. Value: Your API base URL
4. DO NOT check **Encrypted**
5. Scopes: Select all
6. Click **Add** to save

#### Variable 2: `CORS_ORIGIN`
```
Scope: Production, Preview, Development
Type: Public (NOT encrypted)
Value: https://imobi.vercel.app,https://api.imobi.com,https://imobi.com.br
```

**Important**: Use comma-separated list of domains (NO spaces), not semicolons.

**Steps:**
1. Click the **Add** button
2. Name: `CORS_ORIGIN`
3. Value: List all domains that will call your API, comma-separated:
   - `https://imobi.vercel.app` (Vercel preview)
   - `https://api.imobi.com` (API domain)
   - `https://imobi.com.br` (production domain)
4. DO NOT check **Encrypted**
5. Scopes: Select all
6. Click **Add** to save

#### Variable 3: `NODE_ENV`
```
Scope: Production, Preview, Development
Type: Public (NOT encrypted)
Value: production
```

**Steps:**
1. Click the **Add** button
2. Name: `NODE_ENV`
3. Value: `production`
4. DO NOT check **Encrypted**
5. Scopes: Production only
6. Click **Add** to save

#### Variable 4: `EMAIL_PROVIDER`
```
Scope: Production, Preview, Development
Type: Public (NOT encrypted)
Value: sendgrid
```

**Steps:**
1. Click the **Add** button
2. Name: `EMAIL_PROVIDER`
3. Value: `sendgrid`
4. DO NOT check **Encrypted**
5. Scopes: Select all
6. Click **Add** to save

---

## Part 3: Verify Configuration

### Visual Verification Checklist

After adding all variables, verify on the Environment Variables page:

```
✓ DATABASE_URL                  [Encrypted] Production, Preview, Development
✓ NEXT_PUBLIC_SENTRY_DSN        [Public]    Production, Preview, Development
✓ AWS_REGION                    [Public]    Production, Preview, Development
✓ AWS_ACCESS_KEY_ID             [Encrypted] Production, Preview, Development
✓ AWS_SECRET_ACCESS_KEY         [Encrypted] Production, Preview, Development
✓ AWS_S3_BUCKET                 [Public]    Production, Preview, Development
✓ SENDGRID_API_KEY              [Encrypted] Production, Preview, Development
✓ REDIS_URL                     [Encrypted] Production, Preview, Development
✓ NEXT_PUBLIC_API_URL           [Public]    Production, Preview, Development
✓ CORS_ORIGIN                   [Public]    Production, Preview, Development
✓ NODE_ENV                      [Public]    Production
✓ EMAIL_PROVIDER                [Public]    Production, Preview, Development
```

You should see **12 total variables** listed.

### Automated Verification

Run the included validator script:

```bash
./scripts/validate-vercel-env.sh
```

Expected output:
```
🔍 Validating Vercel environment variables...

✅ Configured: 12/12
❌ Missing: 0/12

✨ All environment variables configured!

🚀 Ready to deploy to Vercel
```

---

## Part 4: Test Before Deploying

### Local Testing

```bash
# 1. Create local .env file with your production values
cp .env.vercel.example apps/web/.env.local

# Edit apps/web/.env.local and add your actual secret values

# 2. Build the application locally
pnpm install
pnpm build

# 3. Start the production build
pnpm start

# 4. Test critical flows in browser at http://localhost:3000
#    - Login with test account
#    - View dashboard
#    - Upload a file (tests S3)
#    - Check that emails work (tests SendGrid)
```

### Preview Deployment

Before deploying to production:
1. Push your code to a feature branch
2. Vercel will create a Preview deployment automatically
3. Test the Preview URL thoroughly
4. Once satisfied, merge to `main` for production deployment

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Wrong Variable Name
**Problem**: Variable name is `DATABASE_URL_PROD` instead of `DATABASE_URL`  
**Result**: Application can't find the variable and crashes  
**Solution**: Use exact names from the checklist (copy-paste recommended)

### ❌ Mistake 2: Missing "Encrypted" Checkbox for Secrets
**Problem**: API key marked as Public instead of Encrypted  
**Result**: Secret appears in logs and could be exposed  
**Solution**: Always check "Encrypted" for: DATABASE_URL, API keys, passwords, tokens

### ❌ Mistake 3: Wrong Scope
**Problem**: Variable only set to Production, but needed in Preview builds  
**Result**: Preview deployments fail  
**Solution**: Select all scopes (Production, Preview, Development) unless specific reason not to

### ❌ Mistake 4: Extra Spaces in Values
**Problem**: Value is `postgresql://... ` (trailing space)  
**Result**: Connection fails  
**Solution**: Copy values carefully, trim any extra whitespace

### ❌ Mistake 5: CORS_ORIGIN with Wrong Format
**Problem**: Value is `https://imobi.com.br; https://api.imobi.com` (semicolon + space)  
**Result**: API rejects cross-origin requests  
**Solution**: Use comma-separated list with NO spaces: `https://a.com,https://b.com`

### ❌ Mistake 6: Missing Variables
**Problem**: Added 8 variables but missed REDIS_URL  
**Result**: Application crashes when trying to use cache/queues  
**Solution**: Use validator script to check all 12 are present

### ❌ Mistake 7: Database URL with Wrong Format
**Problem**: Value is just hostname instead of full connection string  
**Result**: Database connection fails immediately  
**Solution**: Use full format: `postgresql://user:password@host:port/database`

---

## Troubleshooting

### Build fails with "Environment Variable not found"

1. **Check variable exists** in Vercel Dashboard:
   - Go to Settings → Environment Variables
   - Search for the variable name
   - If not there, add it using steps above

2. **Check variable spelling**:
   - Copy exact name from error message
   - Verify case (e.g., `DATABASE_URL` not `database_url`)

3. **Check scope**:
   - Variable must have "Production" scope for production builds
   - Variable must have "Preview" scope for preview deployments

4. **Rebuild**:
   - Go to Deployments tab
   - Find the failed deployment
   - Click three dots → Redeploy (without cache)

### Application starts but can't connect to database

1. Check `DATABASE_URL` value:
   ```bash
   # Verify database is accessible from Vercel's IP ranges
   # Most cloud databases allow all IPs by default
   ```

2. Check if database is actually running:
   - Log in to your database provider console
   - Verify the database instance status is "Running"

3. Check connection string format:
   - Must be: `postgresql://user:password@host:port/database`
   - NOT: `postgresql://user:password@host` (missing port/database)

### Emails not sending

1. Verify `SENDGRID_API_KEY`:
   - Check value in Vercel matches SendGrid dashboard
   - Verify API key hasn't been revoked

2. Check `EMAIL_PROVIDER` is set to `sendgrid`

3. Verify SendGrid account has email credits/isn't rate-limited

### S3 uploads failing

1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`:
   - Check IAM user still exists
   - Check access key hasn't been deactivated

2. Verify `AWS_S3_BUCKET` exists and is accessible by that IAM user

3. Check S3 bucket policy allows PutObject action

---

## Next Steps

1. ✅ Configure all 12 environment variables
2. ✅ Run `./scripts/validate-vercel-env.sh` to verify
3. ✅ Test locally with `pnpm build && pnpm start`
4. ✅ Push to feature branch and test Preview deployment
5. ✅ Merge to main for production deployment
6. ✅ Monitor Sentry dashboard for errors

See **VERCEL_REBUILD_CHECKLIST.md** for post-deployment monitoring.
