# Render Deployment Guide for imobi

A complete beginner-friendly guide for deploying the imobi project on Render.com, including database, cache, API, and web services.

---

## Table of Contents

1. [Account Setup](#account-setup)
2. [Create PostgreSQL Database](#create-postgresql-database)
3. [Create Redis Cache](#create-redis-cache)
4. [Create API Web Service](#create-api-web-service)
5. [Create Web Application Service](#create-web-application-service)
6. [Setting Environment Variables](#setting-environment-variables)
7. [Monitoring Deployment](#monitoring-deployment)
8. [After Deployment](#after-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Common Mistakes](#common-mistakes)

---

## Account Setup

### Step 1: Sign Up on Render.com

1. Open your web browser and go to **https://render.com**
2. Click the **"Get Started"** button (usually in the top-right corner)
3. You can sign up using:
   - GitHub account (recommended for this project)
   - Google account
   - Email address
4. If using GitHub:
   - Click **"Continue with GitHub"**
   - Authorize Render to access your GitHub account
   - Review and accept the permissions
   - Click **"Authorize render-oss"**

### Step 2: Access the Dashboard

1. After sign up, you'll be redirected to your **Render Dashboard**
2. The dashboard shows all your services, databases, and resources
3. Bookmark this page: **https://dashboard.render.com**

### Step 3: Connect Your GitHub Account (if not already done)

1. In the dashboard, click your **profile icon** (top-right corner)
2. Select **"Account Settings"** from the dropdown menu
3. On the left sidebar, click **"Connections"**
4. Under "GitHub", click **"Connect"** (if showing) or **"Disconnect & Reconnect"** (if already connected)
5. Follow the GitHub authorization flow
6. You should see a green checkmark next to GitHub when complete

---

## Create PostgreSQL Database

This section creates the PostgreSQL database for imobi's staging environment.

### Step 1: Access the New Database Creation Form

1. From the **Render Dashboard**, click the **"New +"** button (top-left area, below the Render logo)
2. A dropdown menu appears with options:
   - **Web Service**
   - **Static Site**
   - **Database**
   - **Redis**
   - **Redis (Cluster)**
3. Click **"Database"**

### Step 2: Select PostgreSQL

1. A new page appears showing database options:
   - PostgreSQL
   - MySQL
   - MariaDB
2. Click on **"PostgreSQL"**
3. You may be asked to upgrade to a paid plan; follow the prompts if necessary

### Step 3: Fill in Database Details

You'll see a form with the following fields:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `imobi-staging-db` | This identifies your database in the dashboard |
| **Database** | `imobi_staging` | The actual database name inside PostgreSQL |
| **User** | `imobi_staging` | The PostgreSQL user for connections |
| **PostgreSQL Version** | `16` | Latest stable version (14+ required) |
| **Region** | `us-east-1` | Must match Redis and Web Services |
| **Datadog API Key** | (leave blank) | Optional monitoring |

**Important:** Make sure all services use the **same region** (`us-east-1`) to avoid latency and data transfer costs.

### Step 4: Create the Database

1. Scroll to the bottom of the form
2. Click the **"Create Database"** button
3. You'll be redirected to the database detail page
4. **Wait 2-3 minutes** for the database to initialize (you'll see a spinning loader)
5. Once ready, the status will change from "Creating" to "Available"

### Step 5: Copy the Connection String

1. On the database detail page, scroll down to find the **"Connections"** section
2. Look for **"Internal Database URL"** or **"External Database URL"**
   - Use **"Internal Database URL"** if your API is on Render (recommended)
   - Use **"External Database URL"** if accessing from outside Render
3. Click the **copy icon** next to the URL (small clipboard icon)
4. The connection string format looks like:
   ```
   postgresql://imobi_staging:your_password_here@dpg-xxxxx.postgres.render.com:5432/imobi_staging?sslmode=require
   ```
5. **Save this somewhere safe** — you'll need it in the Environment Variables section

---

## Create Redis Cache

Redis is used for caching and job queues (BullMQ).

### Step 1: Access Redis Creation Form

1. From the **Render Dashboard**, click **"New +"** (top-left)
2. Click **"Redis"** from the dropdown menu

### Step 2: Fill in Redis Details

You'll see a form with these fields:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `imobi-staging-redis` | Identifies the Redis instance in the dashboard |
| **Redis Version** | `7` | Latest stable (7+ required for compatibility) |
| **Region** | `us-east-1` | **MUST match the database region** |
| **Eviction Policy** | `noeviction` (default) | Or `allkeys-lru` if you prefer auto-cleanup |
| **Datadog API Key** | (leave blank) | Optional monitoring |

### Step 3: Create the Redis Instance

1. Scroll to the bottom
2. Click **"Create Redis"**
3. Wait 2-3 minutes for initialization
4. Status will change to "Available"

### Step 4: Copy Redis Connection Details

1. On the Redis detail page, look for the **"Connections"** section
2. You'll see these fields:
   - **Hostname**: e.g., `redis-xxxxx.render.com`
   - **Port**: `6379` (default)
   - **Password**: A long string (e.g., `abc123xyz...`)
3. Copy each value separately:
   - Click the copy icon next to **Hostname**
   - Click the copy icon next to **Password**
4. Keep these safe for the Environment Variables section

---

## Create API Web Service

This deploys the NestJS API service.

### Step 1: Access Web Service Creation Form

1. From the **Render Dashboard**, click **"New +"** (top-left)
2. Click **"Web Service"** from the dropdown menu

### Step 2: Connect GitHub Repository

1. A page appears asking "Where is your code?"
2. If this is your first time, click **"Connect account"** next to GitHub
3. Select the GitHub account/organization where `imobi` is located
4. You may be asked to install the Render app on GitHub — follow the prompts
5. Once connected, you'll see a list of available repositories
6. Search for **"imobi"** in the repository list
7. Click on the **"imobi"** repository to select it

### Step 3: Choose Branch and Configuration

After selecting the repository, you'll see a form:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `imbobi-api-staging` | The service name in the dashboard |
| **Branch** | `claude/happy-goldberg-AFQPj` | Or your deployment branch |
| **Root Directory** | `services/api` | Path to the API service in the monorepo |
| **Environment** | `Node` | Automatically detected |
| **Build Command** | `npm install -g pnpm && pnpm install && pnpm build` | Installs pnpm and builds the project |
| **Start Command** | `pnpm --filter @imbobi/api start` | Runs only the API service |
| **Region** | `us-east-1` | **MUST match database and Redis** |
| **Instance Type** | `Starter` | Free tier (0.5 CPU, 512 MB RAM) |

**Important Build Command Notes:**
- Render's default Node doesn't include `pnpm`, so we install it first
- `pnpm install` installs all monorepo dependencies
- `pnpm build` builds all services (Turbo handles this)

### Step 4: Advanced Settings (Optional but Recommended)

Scroll down to see advanced options:

1. **Auto-Deploy**: Keep toggled **ON** (recommended)
   - This auto-deploys on every push to your branch
2. **Pull Request Previews**: Toggle **ON** (optional)
   - Creates preview environments for each PR
3. **Health Check Path**: Set to `/health` or leave empty
   - Render will periodically check if your service is running

### Step 5: Create the Service

1. Scroll to the bottom
2. Click **"Create Web Service"**
3. You'll be redirected to the service detail page
4. Build will start immediately (takes 3-5 minutes)
5. You'll see a **"Building..."** status with a live log

---

## Create Web Application Service

This deploys the Next.js web application.

### Step 1: Access Web Service Creation Form

1. From the **Render Dashboard**, click **"New +"** (top-left)
2. Click **"Web Service"**

### Step 2: Connect GitHub Repository

1. Follow the same steps as the API service (search for "imobi" and select it)
2. If already connected, you'll skip the GitHub connection step

### Step 3: Configure the Web Service

Fill in the form with these values:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `imbobi-web-staging` | The service name in the dashboard |
| **Branch** | `claude/happy-goldberg-AFQPj` | Same branch as API |
| **Root Directory** | `apps/web` | Path to the Next.js app in the monorepo |
| **Environment** | `Node` | Automatically detected |
| **Build Command** | `npm install -g pnpm && pnpm install && pnpm build` | Same as API |
| **Start Command** | `pnpm --filter @imbobi/web start` | Runs only the web service |
| **Region** | `us-east-1` | **MUST match database and Redis** |
| **Instance Type** | `Starter` | Free tier |

### Step 4: Create the Service

1. Scroll to the bottom
2. Click **"Create Web Service"**
3. Build will start immediately (takes 5-7 minutes for Next.js)

---

## Setting Environment Variables

Environment variables tell your services how to connect to the database, Redis, and other services.

### Step 1: Access Environment Variables for API Service

1. From the **Render Dashboard**, find the **"imbobi-api-staging"** service
2. Click on it to open the service detail page
3. On the left sidebar, click **"Environment"**
4. You'll see a section called "Environment Variables"

### Step 2: Add Environment Variables

Click the **"Add Environment Variable"** button for each variable below:

#### Required Variables for API Service

These are critical for the API to function:

1. **DATABASE_URL**
   - Value: Paste the PostgreSQL connection string from the database creation step
   - Example: `postgresql://imobi_staging:password@dpg-xxxxx.postgres.render.com:5432/imobi_staging?sslmode=require`
   - Purpose: Tells the API how to connect to PostgreSQL

2. **REDIS_URL**
   - Value: Build this from Redis connection details
   - Format: `redis://:password@hostname:6379`
   - Example: `redis://:abc123xyz@redis-xxxxx.render.com:6379`
   - Purpose: Tells the API how to connect to Redis

3. **NODE_ENV**
   - Value: `production`
   - Purpose: Tells Node.js to run in production mode

4. **API_PORT** (if your API uses a custom port)
   - Value: `3000` or your configured port
   - Purpose: Sets the port the API listens on

#### Optional Variables

These depend on your specific setup:

5. **JWT_SECRET** (if applicable)
   - Value: A random, long string (generate with `openssl rand -base64 32`)
   - Purpose: Signs authentication tokens

6. **AWS_ACCESS_KEY_ID** (if using S3 for file uploads)
   - Value: Your AWS access key
   - Purpose: Authenticates with AWS S3

7. **AWS_SECRET_ACCESS_KEY** (if using S3)
   - Value: Your AWS secret key
   - Purpose: Authenticates with AWS S3

8. **AWS_S3_BUCKET**
   - Value: Your S3 bucket name (e.g., `imobi-staging-uploads`)
   - Purpose: Tells the API which S3 bucket to use

### Step 3: Add Environment Variables for Web Service

1. From the **Render Dashboard**, find the **"imbobi-web-staging"** service
2. Click on it
3. On the left sidebar, click **"Environment"**

#### Required Variables for Web Service

1. **NEXT_PUBLIC_API_URL**
   - Value: The URL of your API service (e.g., `https://imbobi-api-staging.onrender.com`)
   - Purpose: Tells the Next.js app where to send API requests
   - **Important**: Must start with `NEXT_PUBLIC_` to be available in the browser

2. **NODE_ENV**
   - Value: `production`
   - Purpose: Tells Next.js to run in production mode

#### Optional Variables

3. **NEXT_PUBLIC_APP_URL** (if needed)
   - Value: The URL of your web app (e.g., `https://imbobi-web-staging.onrender.com`)
   - Purpose: Used for links, share buttons, etc.

### Step 4: Save Variables

1. After adding each variable, press **Enter** or click outside the field
2. If you see a yellow/orange warning that the service needs to be redeployed, you'll see a **"Deploy"** or **"Restart"** button
3. Click it to restart the service with the new environment variables
4. Wait for the service to restart (1-2 minutes)

### Important Notes

- **Never hardcode secrets** in code or .env files committed to git
- **Use `.env.example`** to document which variables are needed
- **Order doesn't matter** — add them in any order
- **Spacing matters** — don't add spaces around the `=` sign
- **Copy-paste carefully** — extra spaces or characters will break connections

---

## Monitoring Deployment

### Step 1: View Build Logs

1. After creating a service, you'll see a **"Build Log"** or **"Logs"** tab
2. Click the **"Logs"** tab on the left sidebar
3. You'll see real-time output as the service builds:
   ```
   Building application...
   Installing dependencies...
   Running build script...
   Build completed successfully
   Service running on port 3000
   ```

### Step 2: What to Look For

**Success indicators:**
- "Service running" message
- "Listening on port XXXX"
- No red error messages at the end

**Warning signs:**
- "Error: Cannot find module..." — Missing dependency
- "Database connection failed" — Wrong DATABASE_URL
- "EADDRINUSE: address already in use" — Port conflict
- Build takes longer than 10 minutes — Possible issue (usually takes 3-7 minutes)

### Step 3: Check Service Status

1. From the dashboard, look at the service tile
2. Status indicators:
   - **Green checkmark** = Service running and healthy
   - **Yellow warning icon** = Service having issues
   - **Red X** = Service crashed or failed to start
3. Click on the service to see more details

### Step 4: View Live Logs

1. Click **"Logs"** tab while service is running
2. Check for errors in real-time
3. If something breaks, you'll see error messages here immediately

---

## After Deployment

### Step 1: Get Your Service URLs

1. From the dashboard, click on a service (e.g., `imbobi-api-staging`)
2. At the top of the page, you'll see a blue URL bar with:
   - **Service URL**: e.g., `https://imbobi-api-staging.onrender.com`
3. This is your public URL
4. **Copy this URL** and use it in:
   - Front-end API calls
   - Browser address bar for testing
   - Documentation

### Step 2: Test Your Services

#### Test the API
1. Open your browser
2. Go to `https://imbobi-api-staging.onrender.com/health` (or your health check endpoint)
3. You should see a response (even if it's just `{"status":"ok"}`)

#### Test the Web App
1. Go to `https://imbobi-web-staging.onrender.com`
2. You should see your Next.js application loading
3. Check the browser console for errors (F12 → Console tab)

### Step 3: View Service Metrics

1. Click on a service in the dashboard
2. Scroll down to see:
   - **CPU Usage**: How much processing power it's using
   - **Memory Usage**: How much RAM it's using
   - **Requests**: How many API requests per minute
3. Green graphs = healthy
4. Red/spiking = investigate

### Step 4: Trigger Manual Redeploy

If you need to redeploy without pushing new code:

1. Click on the service
2. Click the **"Manual Deploy"** button (usually top-right)
3. Select the branch and click **"Deploy"**
4. The service will rebuild and restart

### Step 5: View Deployment History

1. Click on the service
2. Click **"Deployments"** tab
3. You'll see a history of all deployments with:
   - Timestamp
   - Commit hash
   - Deployment status (success/failed)
4. Click on any deployment to see its logs

---

## Troubleshooting

### Service won't start: "Build failed"

**Cause**: Dependency or build script error

**Solution**:
1. Click **"Logs"** tab
2. Look for error messages (usually in red)
3. Common errors:
   - Missing `pnpm` — Already handled by our build command
   - Wrong path — Check `Root Directory` is correct
   - Missing environment variable — Check Environment section

### "Cannot connect to database"

**Cause**: Wrong DATABASE_URL or database not ready

**Solution**:
1. Verify the database status (should be "Available")
2. Check DATABASE_URL is copied correctly (no extra spaces)
3. Wait 5 more minutes — database initialization takes time
4. Try restarting the service: Click **"Manual Deploy"** → **"Deploy"**

### "Cannot connect to Redis"

**Cause**: Wrong REDIS_URL format or Redis not ready

**Solution**:
1. Verify Redis status (should be "Available")
2. Check REDIS_URL format: `redis://:password@hostname:6379`
3. Make sure password is included (the part after `:`)
4. Restart the service

### "Service keeps crashing"

**Cause**: Application error, out of memory, or port issues

**Solution**:
1. Check logs for error messages
2. If "out of memory" — upgrade to higher instance tier
3. If application error — check your code and redeploy
4. Check if all required environment variables are set

### "Deployment takes forever" (>15 minutes)

**Cause**: Large dependencies, slow internet, or build issues

**Solution**:
1. Check the logs for "Waiting for..." messages
2. Cancel and retry the deployment
3. Consider splitting into smaller services if possible
4. Check if `pnpm install` is running multiple times (it should run once)

### "Next.js app shows blank page"

**Cause**: API_URL misconfigured or API not responding

**Solution**:
1. Open browser console (F12)
2. Look for errors mentioning "fetch" or API calls
3. Verify NEXT_PUBLIC_API_URL is set and correct
4. Test the API directly in browser
5. Check if both services are running (green status)

### "502 Bad Gateway" error

**Cause**: Service crashed or not listening on correct port

**Solution**:
1. Check service status in dashboard
2. Restart the service: Click **"Manual Deploy"**
3. Verify the Start Command is correct
4. Check the API is listening on the correct port (usually 3000)

---

## Common Mistakes

### Mistake 1: Different Regions for Services

**Problem**: Database in `us-west-1`, API in `eu-west-1`
**Result**: High latency, increased costs
**Fix**: Make sure **all services use the same region** (`us-east-1`)

### Mistake 2: Using External Database URL Inside Render

**Problem**: Copying "External Database URL" for an API service on Render
**Result**: Works but slower and costlier
**Fix**: Use "Internal Database URL" when the API is on Render

### Mistake 3: Forgetting `NEXT_PUBLIC_` Prefix

**Problem**: Setting `API_URL` instead of `NEXT_PUBLIC_API_URL`
**Result**: Front-end can't access the variable
**Fix**: All variables visible to the browser must start with `NEXT_PUBLIC_`

### Mistake 4: Wrong Root Directory Path

**Problem**: Setting Root Directory to `api` instead of `services/api`
**Result**: Build fails — "Cannot find package.json"
**Fix**: Use the **full path from the repo root**:
- API: `services/api`
- Web: `apps/web`

### Mistake 5: Hardcoding Database URL in Code

**Problem**: Putting DATABASE_URL directly in `.env` file that's committed
**Result**: Everyone can see your password
**Fix**: Always use environment variables and add `.env` to `.gitignore`

### Mistake 6: Forgetting to Set Branch in Service Creation

**Problem**: Service deploys from `main` instead of your working branch
**Result**: Old code is deployed, your changes don't appear
**Fix**: Double-check the Branch field during service creation

### Mistake 7: Not Waiting for Database to Initialize

**Problem**: Creating API service immediately after creating database
**Result**: "Database is still initializing" error
**Fix**: Wait for database status to show "Available" (2-3 minutes)

### Mistake 8: Copy-Pasting with Extra Spaces

**Problem**: `DATABASE_URL = postgres://...` (space around `=`)
**Result**: Variable not recognized
**Fix**: No spaces around `=` in environment variables:
- **Wrong**: `KEY = value`
- **Right**: `KEY=value`

### Mistake 9: Using Old/Deprecated Commands

**Problem**: Using `npm` instead of `pnpm` in build/start commands
**Result**: Dependencies not installed correctly or incorrect versions
**Fix**: Always use `pnpm` in our monorepo:
- Build: `npm install -g pnpm && pnpm install && pnpm build`
- Start: `pnpm --filter @imbobi/api start`

### Mistake 10: Forgetting to Update Web App API URL

**Problem**: Creating the API service, then the Web service, but not updating `NEXT_PUBLIC_API_URL`
**Result**: Web app still points to old API
**Fix**: After creating the API service:
1. Copy its URL from the dashboard
2. Go to Web service → Environment
3. Set `NEXT_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com`
4. Redeploy the web service

---

## Summary: Quick Reference

### Dashboard Navigation
- **Dashboard**: https://dashboard.render.com
- **New Service**: Click **"New +"** button (top-left)
- **Service Logs**: Click service → **"Logs"** tab
- **Environment Variables**: Click service → **"Environment"** tab

### Service URLs After Deployment
- API: `https://imbobi-api-staging.onrender.com`
- Web: `https://imbobi-web-staging.onrender.com`

### Key Environment Variables
```
DATABASE_URL=postgresql://imobi_staging:password@host:5432/imobi_staging?sslmode=require
REDIS_URL=redis://:password@hostname:6379
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://imbobi-api-staging.onrender.com
```

### Build Commands
```bash
# Build
npm install -g pnpm && pnpm install && pnpm build

# Start API
pnpm --filter @imbobi/api start

# Start Web
pnpm --filter @imbobi/web start
```

### Expected Times
- Database creation: 2-3 minutes
- Redis creation: 1-2 minutes
- First API build: 3-5 minutes
- First Next.js build: 5-7 minutes
- Service redeploy: 1-3 minutes

---

## Additional Resources

- **Render Docs**: https://render.com/docs
- **Next.js Deployment**: https://render.com/docs/deploy-next
- **NestJS Deployment**: https://render.com/docs/deploy-node
- **Render Blog**: https://render.com/blog
- **Contact Support**: https://render.com/contact

---

## Questions?

If you encounter issues not covered in this guide:

1. Check the **Logs** tab first
2. Search Render's documentation: https://render.com/docs
3. Check the Render status page: https://status.render.com
4. Contact Render support from your account dashboard

Good luck with your deployment!
