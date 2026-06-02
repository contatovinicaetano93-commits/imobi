# imobi on Render — Complete Beginner's Guide

**For Users Deploying imobi for the First Time on Render**

This guide walks you through every single step of deploying imobi to Render, from account creation to a fully working staging environment. No prior experience required.

**Time Required**: ~30-45 minutes  
**Difficulty**: Beginner-friendly  
**Requires**: GitHub account, Render account, web browser  

---

## Table of Contents

1. [Account Setup](#account-setup)
2. [Create PostgreSQL Database](#create-postgresql-database)
3. [Create Redis Cache](#create-redis-cache)
4. [Create API Web Service](#create-api-web-service)
5. [Create Web Web Service](#create-web-web-service)
6. [Setting Environment Variables](#setting-environment-variables)
7. [Monitoring Deployment](#monitoring-deployment)
8. [After Deployment](#after-deployment)
9. [Troubleshooting Common Mistakes](#troubleshooting-common-mistakes)

---

## Account Setup

### Step 1: Create a Render Account

1. Open your web browser and go to **https://render.com**
2. In the top right corner, you'll see a **"Sign Up"** button (or **"Get Started"**)
3. Click on it
4. You'll see options to sign up with:
   - **GitHub** (recommended for deploying imobi)
   - **Email**
   - **Google**

**We recommend "Sign Up with GitHub"** because it makes connecting your imobi repository easier.

5. Click **"Sign Up with GitHub"**
6. If you're not logged into GitHub, log in first
7. Render will ask for permission to access your GitHub repositories — click **"Authorize"**
8. Complete any additional profile information Render requests
9. Once done, you'll see the **Render Dashboard** (the main control panel)

### Step 2: Understand the Render Dashboard

After signing up, you'll be at the **Render Dashboard**. Here's what you're looking at:

**Top Left Area:**
- **Logo**: Shows you're in Render
- **"New +"** button: Click this to create new services (databases, web services, etc.)

**Top Right Area:**
- **Account icon** or **dropdown menu**: For account settings, logout, etc.
- **Notifications bell**: Shows deployment alerts

**Main Area:**
- Empty right now (you haven't deployed anything yet)
- This is where your services will appear once you create them

### Step 3: Connect Your GitHub Repository

Before creating any services, let's authorize Render to access your imobi repository.

1. In the **Render Dashboard**, look for **"Settings"** or a **gear icon** (usually top right)
2. Click **"GitHub"** in the left menu (or look for "Integrations")
3. You should see: **"GitHub is connected"** or a **"Connect GitHub"** button
4. If not connected, click **"Connect GitHub"** and authorize
5. Render will ask which repositories you want to allow — select your imobi repository
6. Click **"Save"**

**You're now ready to create services!**

---

## Create PostgreSQL Database

This is where your application data will be stored.

### Step 1: Open the New Service Menu

1. In your **Render Dashboard**, click the blue **"New +"** button (top left)
2. A dropdown menu appears with several options:
   ```
   - Web Service
   - PostgreSQL
   - Redis
   - Static Site
   - Cron Job
   - Background Worker
   - Private Service
   ```

### Step 2: Select PostgreSQL

1. Click on **"PostgreSQL"** from the dropdown menu
2. Your browser loads a form titled **"Create PostgreSQL Database"**

### Step 3: Fill in the PostgreSQL Configuration Form

You'll see several fields to fill in. Fill them in exactly as shown:

**Field: Name**
- **Value to enter**: `imobi-staging-db`
- **Why**: This identifies your database in the Render dashboard
- Click in the text field and type this name

**Field: Database**
- **Value to enter**: `imobi_staging`
- **Why**: This is the default database that gets created
- Click in the text field and type this name

**Field: User**
- **Value to enter**: Leave this as default (auto-generated, usually `postgres` or similar)
- **Why**: Render creates this user automatically
- Do not change this field

**Field: PostgreSQL Version**
- **Current dropdown value**: Look for a dropdown showing available versions
- **Select**: `14` or `15` or `16` (any version 14+)
- **Why**: Version 14+ has required PostGIS features for GPS validation
- **Recommendation**: Choose `16` (latest) if available

**Field: Region**
- **Current dropdown value**: Shows available AWS regions
- **Select**: `Ohio` (or the closest region to your users)
- **Why**: Lower latency = faster data access
- **Common choices**:
  - `Ohio` = US-East (good for US-based apps)
  - `N. California` = US-West
  - `Frankfurt` = Europe
  - `Singapore` = Asia-Pacific

**Field: Starter Plan**
- **You'll see a toggle or checkbox labeled "Starter"**
- **Action**: Leave it ON (checked) for staging
- **Why**: Starter plan is free/cheap and auto-suspends when not in use
- **For production**: Turn this OFF

### Step 4: Review and Create

1. Scroll down to the bottom of the form
2. Look for a **blue button that says "Create Database"**
3. Click it
4. Render will show a loading screen with status "Creating..."
5. **Do not close the page** — let it load completely

### Step 5: Wait for Database to Be Ready

Render is creating your database. You'll see a progress indicator.

- **Typical time**: 2-3 minutes
- **Status messages to expect**:
  - "Creating..." → "Initializing..." → "Available"

**When you see "Available"**, your database is ready.

### Step 6: Copy the Database Connection String

Once status shows **"Available"**:

1. You'll be on the database instance page
2. Look for a section labeled **"Connections"** or **"Connection Details"** (usually below the status indicator)
3. You'll see two URLs:
   - **Internal Database URL**: For services inside Render
   - **External Database URL**: For services outside Render
4. **For this project**, copy the **Internal Database URL** (since our API will also be on Render)
5. Click the **copy icon** (small clipboard) next to the URL
6. The URL looks like:
   ```
   postgresql://imbobi:A8x9Kp2mL5Q3vN1x@dpg-abc123.postgres.render.com:5432/imobi_staging
   ```
7. **Open a text editor on your computer** (Notepad, TextEdit, VS Code, whatever)
8. Paste this URL and label it: `DATABASE_URL`
9. Save this file — you'll need it later

**What this URL means:**
- `postgresql://` → Protocol (PostgeSQL database)
- `imbobi:A8x9Kp2mL5Q3vN1x` → Username and password
- `dpg-abc123.postgres.render.com` → Host (where the database lives)
- `5432` → Port (standard PostgreSQL port)
- `imobi_staging` → Database name
- `?sslmode=require` → Use secure connection

**Congratulations! Your database is ready.**

---

## Create Redis Cache

Redis stores temporary data like session information and job queues. It's much faster than a database.

### Step 1: Open New Service Menu Again

1. Click the blue **"New +"** button (top left)
2. The dropdown menu appears again

### Step 2: Select Redis

1. Click on **"Redis"** from the dropdown menu
2. Your browser loads a form titled **"Create Redis Instance"**

### Step 3: Fill in the Redis Configuration Form

**Field: Name**
- **Value to enter**: `imobi-staging-cache`
- **Why**: Identifies this Redis instance in your dashboard
- Type this name in the text field

**Field: Region**
- **Select**: The **same region as your PostgreSQL database**
- **Why**: Lower latency between database and cache
- **For example**: If you selected "Ohio" for PostgreSQL, select "Ohio" here too

**Field: Redis Version**
- **Select**: `7` or higher (any version 7+)
- **Why**: Version 7+ has better performance
- **Recommendation**: Choose the latest available

**Field: Eviction Policy** (if this field appears)
- **Select**: `allkeys-lru`
- **Why**: When Redis fills up, it automatically removes least-recently-used data
- **For caching**: This is the best behavior

**Other fields**:
- Leave everything else at default settings
- Don't worry about ACL or other advanced options

### Step 4: Create Redis Instance

1. Scroll down to find the blue **"Create Redis"** button
2. Click it
3. Render shows "Creating..." status

### Step 5: Wait for Redis to Be Ready

- **Typical time**: 1-2 minutes
- Status will change from "Creating..." to "Available"

### Step 6: Copy the Redis Connection Details

Once status shows **"Available"**:

1. Look for the **"Connections"** section
2. Copy the **"Internal Redis URL"** (or just "Redis URL")
3. The URL looks like:
   ```
   redis://:cA3xL9pK2mQ5vN1x@dpg-def456.redis.render.com:6379
   ```
4. **Paste this in your text editor** and label it: `REDIS_URL`

**Or**, if you need separate values:

From the URL `redis://:cA3xL9pK2mQ5vN1x@dpg-def456.redis.render.com:6379`, extract:
- `REDIS_HOST` = `dpg-def456.redis.render.com`
- `REDIS_PORT` = `6379`
- `REDIS_PASSWORD` = `cA3xL9pK2mQ5vN1x` (the part between `:` and `@`)

**Save all of these — you'll need them when setting environment variables.**

**Now you have database and cache ready. Next: deploy the API!**

---

## Create API Web Service

The API is the backend that handles all business logic (user registration, credit processing, etc.).

### Step 1: Create a New Web Service

1. Click the blue **"New +"** button (top left)
2. Click **"Web Service"** from the dropdown

### Step 2: Connect Your GitHub Repository

You'll see a screen asking for your code source.

1. Look for a **"GitHub"** option (or paste public repo URL)
2. Click on **"GitHub"**
3. Render will show repositories you have access to
4. **Search for**: `imobi`
5. Click on the **`imobi`** repository when it appears
6. Click **"Connect"** (blue button)

### Step 3: Fill in the Service Configuration

You're now on the **"Create a Web Service"** form. Fill in these fields:

**Field: Name**
- **Value to enter**: `imbobi-api-staging`
- **Why**: Identifies your API service
- **Important**: This becomes part of your service URL (e.g., `imbobi-api-staging.onrender.com`)

**Field: Environment**
- **Value**: Should auto-detect as `Node`
- If not, select `Node` from dropdown
- **Why**: imobi API is built with Node.js

**Field: Region**
- **Select**: Same region as your database (e.g., "Ohio")
- **Why**: Lower latency between services

**Field: Branch**
- **Select**: `claude/happy-goldberg-AFQPj`
- **Why**: This is the deployment-ready branch
- If you can't find this branch, use `main` or ask your team for the correct branch

**Field: Root Directory**
- **Value to enter**: `services/api`
- **Why**: The monorepo has multiple apps; this tells Render where the API lives
- **Important**: Do not skip this — enter it exactly as shown
- Click in the field and type: `services/api`

### Step 4: Configure Build and Start Commands

These tell Render how to prepare and run your API.

**Build Command field:**

1. Clear any existing text
2. Paste this exactly:
   ```
   npm install -g pnpm && pnpm install && pnpm build
   ```
3. **Why**:
   - `npm install -g pnpm` → Install the package manager
   - `pnpm install` → Install all dependencies
   - `pnpm build` → Compile the code for production

**Start Command field:**

1. Clear any existing text
2. Paste this exactly:
   ```
   pnpm --filter @imbobi/api start
   ```
3. **Why**: Runs only the API service (not everything in the monorepo)

### Step 5: Select Instance Type

Look for **"Instance Type"** or **"Plan"**:

- **For staging**: Select **`Starter`** ($7/month)
  - Free tier runs 50 hours/month
  - Auto-pauses when not in use
  - Good enough for testing
- **For production**: Select **`Standard`** ($25/month+)
  - Always running
  - Better performance
  - Suitable for real users

### Step 6: Review Configuration

Before clicking "Create", verify:

- [ ] Name: `imbobi-api-staging`
- [ ] Environment: `Node`
- [ ] Region: Same as database
- [ ] Branch: `claude/happy-goldberg-AFQPj`
- [ ] Root Directory: `services/api`
- [ ] Build Command: Includes `pnpm` commands
- [ ] Start Command: `pnpm --filter @imbobi/api start`
- [ ] Instance: `Starter` (staging) or `Standard` (production)

### Step 7: Create the Service

1. Scroll to the bottom
2. Look for the blue **"Create Web Service"** button
3. Click it
4. **Wait** for Render to create the service (this redirects you to the service page)

**You should now see a page showing your service with status "Building..."**

---

## Create Web Web Service

The Web service is the frontend that users see (Next.js application).

### Step 1: Create Another Web Service

1. Click the blue **"New +"** button
2. Click **"Web Service"** again

### Step 2: Connect Repository

1. Click **"GitHub"**
2. Search and select **`imobi`** repository
3. Click **"Connect"**

### Step 3: Configure Web Service

**Field: Name**
- **Value to enter**: `imbobi-web-staging`
- **Why**: Identifies your web frontend

**Field: Environment**
- Auto-detects as `Node` (correct)

**Field: Region**
- **Select**: Same as your API (e.g., "Ohio")

**Field: Branch**
- **Select**: `claude/happy-goldberg-AFQPj`
- (Same branch as API)

**Field: Root Directory**
- **Value to enter**: `apps/web`
- **Why**: The frontend is in the `apps/web` folder
- Click in the field and type: `apps/web`

### Step 4: Configure Build and Start Commands

**Build Command:**
```
npm install -g pnpm && pnpm install && pnpm build
```

**Start Command:**
```
pnpm --filter @imbobi/web start
```

### Step 5: Select Instance Type

- **For staging**: `Starter` ($7/month)
- **For production**: `Standard` ($25/month+)

### Step 6: Create the Service

1. Scroll down
2. Click **"Create Web Service"**
3. Wait for the service to be created

---

## Setting Environment Variables

Environment variables are settings that your application reads at startup. They're not committed to Git (for security).

### Where to Find Environment Settings

**For the API service:**

1. Go to your **Render Dashboard** (click **"Dashboard"** or Render logo)
2. Click on the **`imbobi-api-staging`** service (the API you created)
3. You're now on the service page
4. Near the top, you'll see several tabs:
   ```
   Logs  Events  Settings  Environment
   ```
5. Click on the **"Environment"** tab

**For the Web service:**

1. Go to **Dashboard**
2. Click on **`imbobi-web-staging`** service
3. Click on the **"Environment"** tab

### Setting Environment Variables for the API

In the **Environment** tab, you'll see:
- A list of existing variables (if any)
- An input field labeled "Key" and "Value"
- An **"Add"** button

**Follow these steps for each variable:**

1. Click in the **"Key"** field
2. Type the variable name (e.g., `NODE_ENV`)
3. Click in the **"Value"** field
4. Type the variable value
5. Click the **"Add"** button (or press Enter)
6. The variable appears in the list above

**Repeat for each variable below:**

#### Node.js and Application Settings

```
NODE_ENV = staging
PORT = 4000
```

#### Database Connection

From your saved notes, copy the PostgreSQL connection string:

```
DATABASE_URL = postgresql://imbobi:A8x9Kp2mL5Q3vN1x@dpg-abc123.postgres.render.com:5432/imobi_staging
```

Replace the example values with your actual database URL.

#### Redis Connection

From your saved notes, copy the Redis URL:

```
REDIS_URL = redis://:cA3xL9pK2mQ5vN1x@dpg-def456.redis.render.com:6379
```

Or, if you prefer separate fields:

```
REDIS_HOST = dpg-def456.redis.render.com
REDIS_PORT = 6379
REDIS_PASSWORD = cA3xL9pK2mQ5vN1x
```

#### Security Keys

You need to generate two secret keys. Open your terminal and run:

**For JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This outputs a random string like: `A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7b8C9d0E1f2`

Add to environment variables:
```
JWT_SECRET = [paste the output here]
```

**For ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate a different random string and add:
```
ENCRYPTION_KEY = [paste the output here]
```

#### CORS Configuration

This controls which domains can access your API:

```
CORS_ORIGIN = https://imbobi-web-staging.onrender.com,http://localhost:3000
```

Replace `imbobi-web-staging` with your actual web service name if different.

#### AWS S3 Configuration (for image storage)

If you're using AWS S3:

```
AWS_REGION = us-east-1
AWS_S3_BUCKET = imobi-staging-assets
AWS_ACCESS_KEY_ID = [your AWS IAM key]
AWS_SECRET_ACCESS_KEY = [your AWS IAM secret]
```

**To get AWS credentials:**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new IAM user with S3 access
3. Generate an access key and secret key
4. Copy them to these variables

#### Email Service (Optional)

If you want to send emails:

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-app-specific-password
SMTP_FROM = noreply@imbobi.com
```

#### Other Optional Services

**Sentry (error tracking):**
```
SENTRY_DSN = https://your-key@o123.ingest.sentry.io/456789
```

### Setting Environment Variables for the Web Service

Go to the **`imbobi-web-staging`** service and click **"Environment"**.

Add these variables:

```
NEXT_PUBLIC_API_URL = https://imbobi-api-staging.onrender.com/api/v1
NODE_ENV = staging
```

**Important**: Replace `imbobi-api-staging` with your actual API service name if different.

### Save Environment Variables

After adding all variables:

1. Look for a **"Save"** button (usually bottom right)
2. Click it
3. Render will show "Saved" confirmation
4. Your services will automatically restart with the new variables

**Note**: If you don't see a "Save" button, the variables might auto-save. Wait a moment and refresh the page.

---

## Monitoring Deployment

Now let's watch your services deploy and check for errors.

### Checking API Deployment Status

1. Go to **Dashboard**
2. Click on **`imbobi-api-staging`** service
3. Look for the status indicator (usually shows "Building...", "Deploying", or "Live")

**Status meanings:**

| Status | Meaning | Action |
|--------|---------|--------|
| Building... | Compiling code | Wait, don't interrupt |
| Deploying | Starting service | Wait, don't interrupt |
| Live | Service is running | Good! Check logs |
| Failed | Build or startup failed | Click to see error logs |

### Viewing Logs for Errors

1. While on the service page, click the **"Logs"** tab
2. You'll see real-time messages from your service
3. **Look for these good signs:**
   - `npm install` completed
   - `npm run build` succeeded
   - `Database connection successful`
   - `Redis connection successful`
   - `NestJS running on port 4000`
   - `Service running` (shown in green)

4. **Look for these error signs:**
   - Red text (errors)
   - `Error: Cannot find module` (missing dependency)
   - `connection refused` (database/Redis unreachable)
   - `ENOENT: no such file` (file not found)

### Checking Web Deployment Status

1. Go to **Dashboard**
2. Click on **`imbobi-web-staging`** service
3. Check status (should be "Live")
4. Click **"Logs"** tab
5. **Look for these good signs:**
   - `pnpm install` completed
   - `next build` succeeded
   - `Server started` or `ready - started server on`
   - Service status: "Live"

### Expected Build Times

Typical deployment timeline:

| Phase | Duration | What's Happening |
|-------|----------|------------------|
| Repository clone | < 1 min | Downloading code |
| Install dependencies | 1-2 min | npm/pnpm install |
| Build | 2-5 min | TypeScript compile, Next.js build |
| Start service | < 1 min | Starting Node.js process |
| **Total** | **5-10 min** | Service is live |

**Be patient** — the first deploy is slower because dependencies need to download.

---

## After Deployment

### Finding Your Service URLs

1. Go to **Dashboard**
2. For each service, look at the **top of the service page**
3. You'll see your **service URL** — usually something like:
   - **API**: `https://imbobi-api-staging.onrender.com`
   - **Web**: `https://imbobi-web-staging.onrender.com`

**Write these down:**
- API URL: `_________________________________`
- Web URL: `_________________________________`

### Testing the API

**Health Check:**

Open your browser and go to:
```
https://imbobi-api-staging.onrender.com/api/v1/health
```

You should see JSON response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T12:34:56Z"
}
```

If you see an error, check the service logs for error messages.

### Testing the Web App

1. Open your browser
2. Go to your web URL:
   ```
   https://imbobi-web-staging.onrender.com
   ```
3. You should see your landing page
4. Try to navigate to:
   - `/cadastro` — Registration page
   - `/login` — Login page
5. Open browser **Developer Console** (press F12) → **Network tab**
6. Perform an action (like clicking "Register")
7. Look at Network tab — see if API requests are going to your API URL
8. Check response status (should be 200, not 500)

### Running Database Migrations

Migrations set up the database tables your app needs.

**Option 1: Run migrations automatically (recommended)**

The migrations run automatically when the build script includes `prisma migrate deploy`. Check your API Logs tab to confirm:
- Look for: `Applying migrations...`
- Or: `✓ Migrations complete`

**Option 2: Run migrations manually**

This is only if automatic migrations didn't run:

1. Go to the **`imbobi-api-staging`** service page
2. Look for a **"Shell"** tab or button (near Logs, Events)
3. Click it — a terminal window opens
4. Type:
   ```bash
   cd /app && pnpm db:migrate
   ```
5. Press Enter
6. Wait for output like:
   ```
   ✓ Migration 0001_initial applied
   ✓ Migration 0002_add_notifications applied
   ...
   ```

### Checking the Database

To verify tables were created:

1. Go to the **PostgreSQL instance** on Render dashboard
2. Click on it
3. Look for a **"Query Editor"** or **"Connect"** button
4. Connect with the connection string you saved earlier
5. Run a query:
   ```sql
   \dt
   ```
   This lists all tables. You should see tables like:
   - `Usuario`
   - `Credito`
   - `Obra`
   - `EtapaObra`
   - etc.

### Monitoring Service Health

**CPU & Memory Usage:**

1. Go to a service page
2. Look for a **"Metrics"** tab (often next to Logs)
3. You'll see graphs of:
   - **CPU Usage**: Should be low (< 50%) at idle
   - **Memory**: Should be stable and not growing
   - **Requests**: Shows traffic

**Expected values for staging:**
- CPU: 5-20% (idle), up to 80% (under load)
- Memory: 200-500 MB
- Request latency: < 500ms

### Redeploy Manually

If you make code changes and want to deploy without waiting for auto-deploy:

1. Go to the service page
2. Look for a **"Deploy"** or **"Trigger Deploy"** button (top right)
3. Click it
4. Select the branch and commit you want to deploy
5. Click **"Deploy"**

---

## Troubleshooting Common Mistakes

### Mistake 1: Build Fails with "pnpm not found"

**Error message in logs:**
```
bash: pnpm: command not found
```

**Why it happens**: Render doesn't have pnpm installed by default

**Fix**: Update your **Build Command** to:
```
npm install -g pnpm && pnpm install && pnpm build
```

The `npm install -g pnpm` part installs it first.

### Mistake 2: "Cannot find module @imbobi/schemas"

**Error message in logs:**
```
Cannot find module '@imbobi/schemas'
```

**Why it happens**: Monorepo dependencies aren't being installed

**Fix**:

1. Go to the service **"Settings"** tab
2. Look for **"Root Directory"**
3. Ensure it's set to:
   - API: `services/api`
   - Web: `apps/web`
4. Update your **Build Command** to:
   ```
   npm install -g pnpm && pnpm install --recursive && pnpm build
   ```

### Mistake 3: "DATABASE_URL not set" Error

**Error message in logs:**
```
Error: DATABASE_URL environment variable is not set
```

**Why it happens**: Environment variables weren't saved

**Fix**:

1. Go to the service **"Environment"** tab
2. Look through the list of variables
3. Check if `DATABASE_URL` is there
4. If not, add it:
   - Key: `DATABASE_URL`
   - Value: [Your PostgreSQL connection string]
5. Click **"Add"**
6. Click **"Save"** (if there's a save button)
7. Wait 30 seconds for the service to restart
8. Check Logs again

### Mistake 4: Blank Page or 500 Error When Opening Web App

**What you see**: Blank white page or "Error 500"

**Why it happens**: The web app can't reach the API

**Fix**:

1. Check your API service is "Live" (go to Dashboard → API service)
2. Test the API directly in browser: `https://imbobi-api-staging.onrender.com/api/v1/health`
3. If that fails, check API logs
4. If API is working, check the Web app's environment variables:
   - Go to Web service → Environment tab
   - Look for `NEXT_PUBLIC_API_URL`
   - Value should match your API URL: `https://imbobi-api-staging.onrender.com/api/v1`
5. If incorrect, update it:
   - Delete the old variable
   - Add new one with correct value
6. Trigger a redeploy:
   - Go to Web service
   - Click **"Deploy"** or **"Trigger Deploy"**
   - Select latest commit
   - Click **"Deploy"**

### Mistake 5: "Connection refused" Errors in Logs

**Error message in logs:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

or

```
Error: connect ETIMEDOUT
```

**Why it happens**: Service can't reach database or Redis

**Fix**:

1. Verify the connection string is correct:
   - Go to Database → Instance page
   - Copy the **Internal Database URL** again
   - Make sure it matches `DATABASE_URL` in API environment variables
2. Verify database region matches service region:
   - Database region (from Database instance page)
   - API service region (from service page)
   - These should be the same
3. Wait a few minutes — sometimes it takes time for connections to work
4. Restart the service:
   - Go to API service
   - Click **"Settings"**
   - Look for **"Restart Service"** button
   - Click it

### Mistake 6: CORS Errors in Browser Console

**Error in browser console (F12):**
```
Access to XMLHttpRequest at 'https://imbobi-api-staging.onrender.com/...' 
from origin 'https://imbobi-web-staging.onrender.com' has been blocked by CORS policy
```

**Why it happens**: Your API doesn't allow requests from your web app's origin

**Fix**:

1. Get your web app's full URL:
   - Go to Dashboard → Web service
   - Copy the service URL (e.g., `https://imbobi-web-staging.onrender.com`)
2. Go to Dashboard → API service → Environment tab
3. Find or create `CORS_ORIGIN` variable
4. Value should be:
   ```
   https://imbobi-web-staging.onrender.com,http://localhost:3000
   ```
5. Click **"Add"** or **"Save"**
6. Wait for API to restart
7. Refresh the web app in your browser

### Mistake 7: Services Keep Restarting or Crashing

**What you see**: Service status shows "Restarting..." repeatedly or "Failed"

**Why it happens**: Service crashes shortly after starting (memory issue, infinite loop, etc.)

**Fix**:

1. Check the **Logs** tab carefully
2. Look for error messages near the end
3. Common causes:
   - **Out of memory**: Service is too big for Starter tier
     - Upgrade to Standard tier
     - Or optimize code
   - **Infinite loop**: Code is stuck
     - Check for bugs in recent changes
     - Revert to previous working version
   - **Missing environment variable**: Required secret isn't set
     - Add the missing variable

4. If you can't find the error:
   - Click **"Restart Service"** in Settings
   - Watch the logs closely for the exact error message
   - Search error message in documentation or GitHub issues

### Mistake 8: "Service running on wrong port" Error

**Error in logs:**
```
Error: listen EADDRINUSE :::4000
```

**Why it happens**: The service is already running on that port

**Fix**:

1. Go to service **"Settings"** tab
2. Find **"Port"** or look in environment variables for `PORT`
3. It should be `4000` (or whatever is in your Start Command)
4. Restart the service:
   - In Settings, click **"Restart Service"**

---

## Quick Reference: All URLs and Credentials

**Print this section and keep it handy!**

### Service URLs (after deployment)

| Service | URL | Purpose |
|---------|-----|---------|
| **Web App** | `https://imbobi-web-staging.onrender.com` | Where users go |
| **API** | `https://imbobi-api-staging.onrender.com` | Backend services |
| **API Health Check** | `https://imbobi-api-staging.onrender.com/api/v1/health` | Test API is working |
| **Render Dashboard** | `https://dashboard.render.com` | Manage services |

### Key Environment Variable Names

| Variable | Used By | Example Value |
|----------|---------|----------------|
| `DATABASE_URL` | API | `postgresql://...` |
| `REDIS_URL` | API | `redis://:password@...` |
| `JWT_SECRET` | API | 64-char random string |
| `ENCRYPTION_KEY` | API | 32-byte random string |
| `NEXT_PUBLIC_API_URL` | Web | `https://imbobi-api-staging.onrender.com/api/v1` |
| `CORS_ORIGIN` | API | `https://imbobi-web-staging.onrender.com` |

### File Locations in Repository

| Path | Purpose | Deployed To |
|------|---------|-------------|
| `services/api/` | Backend API | Separate Render service |
| `apps/web/` | Web frontend | Separate Render service |
| `apps/mobile/` | Mobile app | Expo (separate) |
| `packages/@imbobi/schemas/` | Shared validation | Included in builds |
| `packages/@imbobi/core/` | Shared utilities | Included in builds |
| `packages/@imbobi/ui/` | UI components | Included in builds |

---

## Need More Help?

### Common Questions Answered

**Q: How do I update code after deployment?**
A: Push to your GitHub branch. Render auto-deploys if you enabled auto-deploy. Or manually trigger deploy from the service page.

**Q: Can I have multiple staging environments?**
A: Yes! Repeat these steps with different service names:
- `imbobi-api-staging-1`, `imbobi-api-staging-2`, etc.
- Each gets its own database and Redis
- Each has its own URL

**Q: Can I use a custom domain instead of onrender.com?**
A: Yes (paid feature). Go to service → Settings → Custom Domain. Requires domain and SSL certificate setup.

**Q: How much does this cost?**
A: Approximately:
- PostgreSQL: Free (if using Starter)
- Redis: Free (if using Starter)
- API: $7-25/month (Starter-Standard)
- Web: $7-25/month (Starter-Standard)
- **Total: ~$28-75/month for staging**

**Q: What's the difference between Starter and Standard?**

| Feature | Starter | Standard |
|---------|---------|----------|
| Cost | $7/month | $25/month |
| Uptime | 50 hrs/month free | 99% uptime SLA |
| Auto-pause | Yes (after 15 min) | No |
| Bandwidth | Limited | Unlimited |
| Auto-scaling | No | Yes |
| Best for | Development | Production |

**Q: How do I backup my database?**
A: PostgreSQL on Render includes automatic daily backups. Go to Database instance → Backups tab to view or restore.

**Q: How do I monitor performance?**
A: Go to any service → Metrics tab. See CPU, memory, request count, latency.

---

## Final Checklist

Before considering your deployment complete:

- [ ] Render account created and logged in
- [ ] GitHub repository connected
- [ ] PostgreSQL database created ("Available" status)
- [ ] Redis instance created ("Available" status)
- [ ] Database connection string saved
- [ ] Redis connection string saved
- [ ] API service created (status "Live")
- [ ] Web service created (status "Live")
- [ ] All environment variables added and saved
- [ ] API health endpoint responds: `/api/v1/health`
- [ ] Web app loads without errors
- [ ] Database migrations executed (check logs)
- [ ] No error messages in service logs
- [ ] API and Web service URLs noted
- [ ] Can register a user in the web app
- [ ] Can log in to the web app

**If all boxes are checked, you're done! 🎉**

---

## Deployment Timeline Summary

**Total Time: ~30-45 minutes**

| Task | Time | Cumulative |
|------|------|-----------|
| Account setup | 5 min | 5 min |
| Create PostgreSQL | 5 min | 10 min |
| Create Redis | 3 min | 13 min |
| Create API service | 10 min (building) | 23 min |
| Create Web service | 10 min (building) | 33 min |
| Set environment variables | 5 min | 38 min |
| Test and verify | 5-10 min | 43-48 min |

---

## Important Reminders

1. **Never commit `.env` files to Git** — Always use the Render dashboard for secrets
2. **Keep connection strings safe** — Don't share your DATABASE_URL or API keys with others
3. **Test everything before going live** — Verify migrations ran and data loads correctly
4. **Monitor logs regularly** — Check logs after deployment for hidden errors
5. **Backup before production** — Enable backups before deploying to production
6. **Use strong passwords** — Especially for database and API secrets (20+ characters)
7. **Auto-deploy is your friend** — Enable GitHub auto-deploy so code updates deploy automatically

---

**Last Updated**: June 2, 2026  
**For**: imobi Staging Deployment  
**Guide Version**: 2.0 (Beginner's Complete Edition)  
**Status**: Ready for First-Time Deployers
