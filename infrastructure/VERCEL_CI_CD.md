# Vercel CI/CD & GitHub Integration Guide

This guide covers continuous deployment, branch protection rules, and GitHub integration for the Vercel-hosted Next.js frontend.

## Architecture Overview

```
GitHub Push
    ↓
Vercel Webhook (triggered)
    ↓
Build & Deploy (automatic)
    ├─ main branch → Production (https://yourdomain.vercel.app)
    └─ PR branch → Preview (https://pr-123-imobi.vercel.app)
    ↓
GitHub Status Check (updated)
    ↓
PR Status Updated (mergeable if passing)
```

## 1. GitHub Integration Setup

### 1.1 Verify Vercel GitHub App is Connected

**In Vercel Dashboard:**

1. Go to **Settings** → **Git**
2. Verify **Vercel for GitHub** shows: "Connected ✓"
3. If not connected:
   - Click **"Connect"**
   - Authorize the Vercel GitHub App
   - Select the repository: `contatovinicaetano93-commits/imobi`

### 1.2 Configure Git Settings

In Vercel **Settings** → **Git**:

**Deploy on Push:**
- ✓ Enabled (automatic deployment on push)

**Deploy on Pull Request:**
- ✓ Enabled (preview deployments on each PR)

**Production Branch:**
- Set to: `main`
- Only `main` branch deploys to production URL
- Other branches get preview URLs: `https://pr-<id>-imobi.vercel.app`

**Ignored Build Step:**
- Leave empty (use default)

## 2. Deployment Strategy

### 2.1 Main Branch (Production)

**Trigger:** Push to `main`

**Behavior:**
1. Vercel builds Next.js app
2. Deploys to production URL: `https://yourdomain.vercel.app`
3. GitHub status check: ✓ "Production deployment successful"
4. No rollback needed (can use Vercel's "Rollback" feature)

**Commands executed:**
```bash
cd ../.. && pnpm build --filter=@imbobi/web
```

**Deployment time:** 2-5 minutes

### 2.2 Pull Request (Preview)

**Trigger:** Create PR from feature branch

**Behavior:**
1. Vercel creates ephemeral preview deployment
2. Available at: `https://pr-<id>-imobi.vercel.app`
3. GitHub adds status check: "Pending — Preview deployment in progress"
4. Comment with preview URL appears on PR
5. Status updates: ✓ "Preview deployment successful"

**Available for:**
- Code review before merge
- Stakeholder review
- QA testing
- Automated testing (E2E tests can run against preview)

**Auto-cleanup:**
- Preview deployment deleted when PR is closed
- Automatically cleaned up by Vercel

### 2.3 Feature Branches (No Production Deployment)

**Trigger:** Push to non-main, non-PR branches

**Behavior:**
1. Vercel skips automatic deployment (unless in open PR)
2. Manual deployment available in Vercel Dashboard if needed

## 3. Branch Protection Rules

### 3.1 Enforce Passing Vercel Deployment

**In GitHub Repository Settings:**

1. Go to **Settings** → **Branches**
2. Click **"Add rule"** (or edit existing `main` rule)
3. **Branch name pattern:** `main`

### 3.2 Required Status Checks

Under **Require status checks to pass before merging**:

Enable:
- [ ] **Vercel deployment** (must show ✓)
- [ ] **Type checks** (turbo type-check)
- [ ] **Linting** (turbo lint)
- [ ] **Other tests** (if applicable)

This prevents merging PRs with:
- Failed Vercel deployments
- Failed type checks
- Failed linting

### 3.3 Additional Protections

**Recommended settings:**

1. **Require pull request reviews before merging:**
   - Require at least 1 approval
   - Dismiss stale pull request approvals when new commits are pushed

2. **Require branches to be up to date before merging:**
   - Ensures tests run against latest main

3. **Require code reviews from code owners:**
   - Use `.github/CODEOWNERS` file (optional)

4. **Restrict who can push to matching branches:**
   - Limit to admins/maintainers

### 3.4 Setup Example (CLI)

If using GitHub CLI (`gh`):

```bash
gh repo edit contatovinicaetano93-commits/imobi \
  --enable-auto-merge \
  --allow-update-branch

gh api repos/contatovinicaetano93-commits/imobi/branches/main/protection \
  -X PUT \
  -f required_status_checks.strict=true \
  -f required_status_checks.contexts='["Vercel"]' \
  -f required_pull_request_reviews.required_approving_review_count=1
```

## 4. Deployment Workflow

### 4.1 Local Development

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes
# ...

# 3. Type check locally
pnpm type-check

# 4. Lint locally
pnpm lint

# 5. Test locally
pnpm dev
# Visit http://localhost:3000 and verify

# 6. Commit
git add apps/web/
git commit -m "feat(web): add new feature"

# 7. Push
git push origin feature/my-feature
```

### 4.2 Create Pull Request

```bash
# GitHub CLI
gh pr create --title "Add new feature" --body "Description..."

# OR

# Go to GitHub and create PR manually
# - Base: main
# - Compare: feature/my-feature
```

### 4.3 Vercel Preview Deployment

**Automatic:**
1. PR created → Vercel webhook triggered
2. Build starts (2-5 minutes)
3. Preview URL available: `https://pr-123-imobi.vercel.app`
4. GitHub shows status: ✓ "Preview deployment successful"
5. Vercel comments on PR with preview URL

**Manual QA:**
1. Click preview URL
2. Test feature in live environment
3. Verify API connectivity
4. Check environment variables

### 4.4 Code Review & Approval

1. Reviewer checks code
2. Reviewer tests on preview deployment
3. Reviewer approves PR
4. Branch is up to date with main

### 4.5 Merge to Main

Once approved:
```bash
# GitHub CLI
gh pr merge 123 --squash

# OR manually in GitHub UI
# Click "Merge pull request"
```

**After merge:**
1. Vercel triggers production deployment
2. Build starts (2-5 minutes)
3. Status check: ✓ "Production deployment successful"
4. App is live at production URL
5. Preview deployment auto-deleted

## 5. Rollback Procedure

### 5.1 Quick Rollback (Recommended)

**In Vercel Dashboard:**

1. Go to **Deployments**
2. Find the previous good deployment
3. Click **"..."** menu
4. Select **"Promote to Production"**
5. Confirm rollback

**Time:** < 1 minute
**Cause:** Bad deployment, bugs, or issues

### 5.2 Git-based Rollback

If rollback via Vercel is not possible:

```bash
# 1. Create rollback commit
git revert HEAD

# 2. Push to main
git push origin main

# 3. Vercel automatically deploys
# (wait 2-5 minutes)

# 4. Verify rollback successful
# Check production deployment
```

### 5.3 Emergency Hotfix

If main has a critical bug:

```bash
# 1. Create hotfix branch from last good tag
git checkout -b hotfix/critical-fix v1.0.0

# 2. Make critical fix
# ...

# 3. Commit and push
git push origin hotfix/critical-fix

# 4. Create PR and merge (no review if critical)
# OR merge directly to main

# 5. Tag for reference
git tag v1.0.1
git push origin v1.0.1
```

## 6. Deployment Monitoring

### 6.1 Check Deployment Status

**In Vercel Dashboard:**

1. Go to **Deployments**
2. See list of recent deployments
3. Each shows:
   - Status (✓ Ready, ⏳ Building, ✗ Failed)
   - Duration (build time)
   - Commit/branch
   - Trigger (push or manual)

### 6.2 View Build Logs

1. Click on deployment
2. See detailed build logs:
   ```
   pnpm install --frozen-lockfile
   Running "build" with args [...]
   next build
   ... (build output)
   ```

### 6.3 GitHub Status Checks

On PR, see:
- **Status checks** section
- Click **Details** to see Vercel deployment logs
- All required checks must pass before merge

### 6.4 Alerts & Notifications

**Email notifications (default):**
- Deployment completed (success or failure)
- High resource usage
- Custom alerts

**Configure:**
1. Vercel Settings → **Notifications**
2. Enable/disable per event type

## 7. Environment-Specific Deployments

### 7.1 Staging Environment (Optional)

To deploy to separate staging URL:

1. Create branch: `staging`
2. In Vercel, create separate project or configure branch
3. Set different environment variables:
   - `NEXT_PUBLIC_API_URL=https://api-staging.yourdomain.com`
4. Deploy via: `git push origin staging`

### 7.2 Different Environments

```
Branch         → Vercel URL                           → API URL
──────────────────────────────────────────────────────────────────
main           → https://yourdomain.vercel.app        → https://api.yourdomain.com
staging        → https://staging.yourdomain.vercel.app → https://api-staging.yourdomain.com
feature/*      → https://pr-*-imobi.vercel.app        → https://api.yourdomain.com
```

## 8. Performance Optimization

### 8.1 Build Optimization

Vercel automatically:
- Minifies code
- Optimizes images
- Bundles dependencies
- Enables caching

### 8.2 Deployment Caching

Vercel caches:
- Dependencies (faster installs)
- Build artifacts
- Functions

To invalidate cache:
1. Go to **Settings** → **General**
2. Click **"Redeploy"**
3. Select deployment to redeploy
4. Vercel rebuilds from scratch

### 8.3 Next.js Image Optimization

Already configured in `next.config.js`:
```javascript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "**.amazonaws.com" },
    { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
  ],
}
```

This enables Vercel Image Optimization for S3 images.

## 9. Troubleshooting

### 9.1 Deployment Fails: "pnpm not found"

**Solution:**
1. Go to Vercel **Settings** → **Build & Development Settings**
2. Set **Build Command** to:
   ```
   cd ../.. && pnpm build --filter=@imbobi/web
   ```
3. Redeploy

### 9.2 Preview Deployment Shows Blank Page

**Causes:**
1. Environment variable `NEXT_PUBLIC_API_URL` not set for preview
2. API server not accessible from preview environment
3. CORS not configured

**Solution:**
1. Check Vercel environment variables
2. Verify API URL is accessible
3. Check API CORS configuration
4. Look at browser console for errors

### 9.3 Preview Deployment Never Completes

**Causes:**
1. Dependency installation timeout
2. Build timeout
3. Missing environment variables

**Solution:**
1. Check build logs in Vercel
2. Verify all dependencies in `package.json`
3. Check for large file uploads
4. Increase build timeout (if supported on plan)

### 9.4 Production Deployment Blocks Merge

**Issue:** GitHub status check shows ✗ "Deployment failed"

**Solution:**
1. Check Vercel deployment logs
2. Fix issues (missing env vars, build errors, etc.)
3. Push fix to same PR branch
4. Vercel redeploys automatically
5. Once ✓ passes, can merge

## 10. Best Practices

### 10.1 Commit Messages

Use conventional commits for clear history:
```
feat(web): add new feature description
fix(web): fix specific bug
docs(web): update documentation
chore(web): update dependencies
```

### 10.2 Branch Naming

Use descriptive branch names:
```
feature/user-auth
bugfix/mobile-responsiveness
hotfix/critical-api-issue
docs/update-readme
```

### 10.3 PR Reviews

Before merge:
- [ ] Code review approved
- [ ] Preview deployment passes
- [ ] All status checks pass
- [ ] Tested on preview URL
- [ ] Team approved changes

### 10.4 Deploy Frequency

Recommended deployment cadence:
- **Critical fixes:** Immediate (hotfix to main)
- **Features:** Daily or per-feature (PR → merge)
- **Patches:** As needed

## 11. Disaster Recovery

If production is down:

1. **Immediate action:** Rollback to last good deployment (< 1 min)
2. **Identify issue:** Check deployment logs
3. **Create hotfix:** Fix locally and commit
4. **Test on preview:** Create PR and verify fix
5. **Deploy fix:** Merge to main
6. **Monitor:** Watch for issues

See `infrastructure/DISASTER_RECOVERY.md` for full runbook.

## 12. Next Steps

- Review `infrastructure/VERCEL_SETUP.md` for initial deployment
- Configure branch protection rules (Section 3)
- Set up monitoring alerts (Section 6.4)
- Plan staging environment (Section 7)

## Useful Commands

```bash
# View Vercel status
gh repo view contatovinicaetano93-commits/imobi

# List deployments (if using Vercel CLI)
vercel list

# Rollback to previous deployment
vercel rollback

# Trigger manual deployment
vercel deploy --prod
```

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- GitHub Docs: https://docs.github.com/en/actions
- Troubleshooting: `infrastructure/TROUBLESHOOTING.md`
