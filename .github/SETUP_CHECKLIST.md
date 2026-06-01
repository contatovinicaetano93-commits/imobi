# CI/CD Setup Checklist for imobi

Complete this checklist to fully enable all CI/CD automations.

## Files Created

All files have been created and are ready to commit:

### GitHub Actions Workflows
- [x] `.github/workflows/type-check.yml` - TypeScript validation
- [x] `.github/workflows/build.yml` - Build validation with artifacts
- [x] `.github/workflows/security-audit.yml` - Weekly security audit

### Configuration Files
- [x] `.github/dependabot.yml` - Automated dependency updates
- [x] `.github/pull_request_template.md` - PR checklist template

### Scripts
- [x] `scripts/pre-push.sh` - Pre-push type-check hook
- [x] `scripts/setup-hooks.sh` - Git hooks installer

### Documentation
- [x] `.github/WORKFLOWS.md` - Complete workflow documentation
- [x] `.github/SETUP_CHECKLIST.md` - This checklist

## GitHub Repository Setup

### Step 1: Enable GitHub Actions
1. Go to: **Settings > Actions > General**
2. Under "Actions permissions" select: **Allow all actions and reusable workflows**
3. Click **Save**

### Step 2: Enable Dependabot
1. Go to: **Settings > Code security and analysis**
2. Enable:
   - [ ] **Dependabot alerts** (turn ON)
   - [ ] **Dependabot security updates** (turn ON)
   - [ ] **Dependency graph** (turn ON)
3. Click to enable each option

### Step 3: Configure Auto-Merge for Dependabot
1. Go to: **Settings > General > Pull Requests**
2. Enable:
   - [ ] **Allow auto-merge** (check box)
   - Select merge method: **Squash and merge** or **Create a merge commit**
3. Click **Save**

### Step 4: Verify Workflow Permissions (Important!)
1. Go to: **Settings > Actions > General**
2. Scroll to "Workflow permissions"
3. Select: **Read and write permissions**
4. Check: **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

## Local Development Setup

### Step 1: Install Git Hooks
```bash
# From project root
./scripts/setup-hooks.sh
```

Expected output:
```
Setting up Git hooks...
✓ Installed pre-push hook
Git hooks setup complete!
```

### Step 2: Test Pre-push Hook
```bash
# This should pass if TypeScript is valid
./scripts/pre-push.sh
```

### Step 3: Verify Workflows Work Locally
```bash
# Test type-check
pnpm type-check

# Test build
pnpm build

# Test security audit
pnpm audit
```

## Verification Steps

### Check Workflow Files
```bash
# All files should exist
ls -la .github/workflows/
ls -la .github/dependabot.yml
ls -la .github/pull_request_template.md
ls -la scripts/{pre-push,setup-hooks}.sh
```

### Test Pre-push Hook
```bash
# Make a dummy change to verify hook blocks invalid TypeScript
echo "invalid: " >> packages/schemas/src/index.ts
git add packages/schemas/src/index.ts

# Try to push - should be blocked
git commit -m "test: invalid ts"
# git push  # This would be blocked by pre-push hook

# Revert the change
git reset HEAD packages/schemas/src/index.ts
git checkout packages/schemas/src/index.ts
```

### View Workflows in GitHub
After first push to main/develop/claude/* branch:
1. Go to repository **Actions** tab
2. Should see:
   - [ ] **Type Check** - running
   - [ ] **Build** - running
   - [ ] **Security Audit** - scheduled

### Verify Dependabot PR Creation
1. After 24 hours, Dependabot should create PRs if updates available
2. Go to **Pull Requests** tab
3. Look for PRs from "dependabot[bot]"
4. Verify auto-merge is working (auto-merged PRs will be closed)

## Post-Setup Configuration

### Custom Branches
If you have other branches besides main/develop/claude/*, update workflows:

**Edit all workflow files** (type-check.yml, build.yml):
```yaml
on:
  push:
    branches:
      - main
      - develop
      - staging  # ADD YOUR BRANCH HERE
      - 'claude/**'
  pull_request:
    branches:
      - main
      - develop
      - staging  # ADD YOUR BRANCH HERE
      - 'claude/**'
```

### Customize Schedules
**Dependabot schedule** in `.github/dependabot.yml`:
```yaml
schedule:
  interval: "weekly"      # Change to daily/weekly/monthly
  day: "monday"           # Change day
  time: "03:00"           # Change time (UTC)
```

**Security audit schedule** in `.github/workflows/security-audit.yml`:
```yaml
schedule:
  # Cron format: minute hour day-of-month month day-of-week
  - cron: '0 2 * * 4'  # Thursday 02:00 UTC
```

### Slack/Discord Notifications (Optional)
Add to any workflow for notifications:
```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

Then add `SLACK_WEBHOOK` to **Settings > Secrets and variables > Actions**

## Troubleshooting

### Workflows don't appear in Actions tab
- Wait 5 minutes for GitHub to detect new workflow files
- Push to main/develop/claude/* branch (not other branches)
- Check workflow file syntax: `*.yml` format
- View errors: Settings > Actions > Failed workflows

### Dependabot not creating PRs
- Verify Settings > Code security and analysis > Dependabot enabled
- Check if private repository (Dependabot only works on public or pro)
- Wait 24-48 hours for first run
- Manually trigger: Settings > Code security and analysis > Dependabot > Run now

### Pre-push hook not running
- Verify file exists: `ls -la .git/hooks/pre-push`
- Check permission: `chmod +x .git/hooks/pre-push`
- Verify it's executable: `file .git/hooks/pre-push`
- Test manually: `./scripts/pre-push.sh`

### Auto-merge not working for Dependabot
- Enable "Allow auto-merge" in Settings > General > Pull Requests
- Check PR status checks are all green
- Verify Dependabot has write access: Settings > Actions > General > Workflow permissions
- Check PR doesn't have conflicts

## Cleanup (If needed)

### Remove Git Hooks
```bash
rm -rf .git/hooks/pre-push
```

### Disable Workflow
1. Delete the `.yml` file, OR
2. Go to Settings > Actions > General > Disable actions

### Disable Dependabot
1. Delete `.github/dependabot.yml`, OR
2. Go to Settings > Code security and analysis > Disable Dependabot

## Next Steps

1. **Commit these files**:
   ```bash
   git add .github/ scripts/
   git commit -m "ci: configure github actions and dependabot"
   ```

2. **Push to GitHub**:
   ```bash
   git push origin claude/happy-goldberg-AFQPj
   ```

3. **Create Pull Request** on GitHub and verify workflows run

4. **Monitor workflows** in Actions tab

5. **Wait 24h** for Dependabot's first run

## Quick Links

- GitHub Actions Documentation: https://docs.github.com/en/actions
- Dependabot Documentation: https://docs.github.com/en/code-security/dependabot
- Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Cron Schedule Generator: https://crontab.guru

## Support

If you encounter issues:
1. Check `.github/WORKFLOWS.md` for detailed documentation
2. Review GitHub Actions logs in repository Actions tab
3. Check Dependabot logs in Settings > Code security and analysis > Dependabot alerts
4. Verify pnpm configuration: `pnpm --version`
5. Check Node version: `node --version` (should be 22.x)
