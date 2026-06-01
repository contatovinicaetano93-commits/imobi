# CI/CD Workflows - imobi

This document describes all configured GitHub Actions workflows and automations for the imobi project.

## Workflows

### 1. Type Check (`type-check.yml`)
- **Trigger**: Push to main/develop/claude/* + Pull Requests
- **Purpose**: Validates TypeScript type safety across all packages
- **Command**: `pnpm type-check`
- **Status Badge**: Add to README:
  ```markdown
  ![Type Check](https://github.com/[owner]/[repo]/actions/workflows/type-check.yml/badge.svg)
  ```

### 2. Build (`build.yml`)
- **Trigger**: Push to main/develop/claude/* + Pull Requests
- **Purpose**: Builds all packages and validates the build process
- **Command**: `pnpm build`
- **Artifacts**: Uploaded for 5 days
- **Status Badge**:
  ```markdown
  ![Build](https://github.com/[owner]/[repo]/actions/workflows/build.yml/badge.svg)
  ```

### 3. Security Audit (`security-audit.yml`)
- **Trigger**: Weekly on Thursday at 02:00 UTC (or manually via workflow_dispatch)
- **Purpose**: Audits dependencies for security vulnerabilities
- **Command**: `pnpm audit`
- **Auto-Actions**:
  - Automatically creates GitHub issues if high/critical vulnerabilities are found
  - Labels: `security`, `dependencies`
  - Report uploaded as artifact
- **Manual Trigger**: Go to Actions tab > Security Audit > Run workflow

### 4. Dependabot Configuration (`dependabot.yml`)
- **NPM Dependencies**:
  - Updates: Weekly on Monday at 03:00 UTC
  - Auto-merge: Patch & minor versions with 100% compatibility
  - Limit: 5 open PRs at once

- **Docker Images**:
  - Updates: Weekly on Monday at 04:00 UTC
  - Limit: 3 open PRs at once

- **GitHub Actions**:
  - Updates: Weekly on Monday at 05:00 UTC
  - Auto-merge: Minor & patch versions
  - Limit: 3 open PRs at once

## Git Hooks

### Pre-push Hook (`scripts/pre-push.sh`)
- **Purpose**: Runs type-check locally before allowing push
- **Prevents**: Pushing code with TypeScript errors
- **Installation**:
  ```bash
  ./scripts/setup-hooks.sh
  ```
- **Manual Install**:
  ```bash
  cp scripts/pre-push.sh .git/hooks/pre-push
  chmod +x .git/hooks/pre-push
  ```

## Pull Request Template
- **File**: `.github/pull_request_template.md`
- **Auto-applied**: To all new PRs
- **Enforces**:
  - Clear description of changes
  - Type of change classification
  - Checklist verification
  - Related issue links

## Setup Instructions

### 1. Enable Workflows in GitHub Settings
1. Go to repository Settings > Actions
2. Ensure "All actions and reusable workflows" is selected
3. Verify all workflows are enabled:
   - ✓ Type Check
   - ✓ Build
   - ✓ Security Audit
   - ✓ Dependabot

### 2. Enable Dependabot
1. Go to repository Settings > Code security and analysis
2. Enable:
   - ✓ Dependabot alerts
   - ✓ Dependabot security updates
   - ✓ Dependency graph
3. Configure auto-merge (Settings > General > Pull requests):
   - ✓ Allow auto-merge (SQUASH or MERGE)

### 3. Install Git Hooks Locally
```bash
./scripts/setup-hooks.sh
```

### 4. Verify Setup
```bash
# Test type-check locally
pnpm type-check

# Test build
pnpm build

# Test pre-push hook
./scripts/pre-push.sh
```

## Troubleshooting

### Workflow fails but code looks fine
- Clear pnpm cache: `rm -rf node_modules pnpm-lock.yaml`
- Reinstall: `pnpm install`
- Re-run workflow

### Dependabot not creating PRs
- Check Settings > Code security and analysis > Dependabot
- Ensure Dependabot alerts are enabled
- Check `.github/dependabot.yml` configuration

### Pre-push hook blocking legitimate pushes
- Verify TypeScript config: `pnpm type-check`
- Check for conflicting dependencies: `pnpm audit`
- Temporarily bypass (not recommended): `git push --no-verify`

### Auto-merge not working
- Verify Settings > General > Pull requests > Allow auto-merge is enabled
- Check PR status checks are all green
- Ensure Dependabot PRs have proper write permissions

## Monitoring

### View Workflow Status
1. Go to repository > Actions tab
2. Click on workflow name to see runs
3. Click on specific run to see details

### View Security Alerts
- Settings > Code security and analysis > Dependabot alerts
- Issues > Labels: "security"

### Performance Tips
- Workflows run in parallel (type-check and build don't block each other)
- Cache is automatically managed (pnpm)
- Artifacts auto-cleanup after 5-30 days (configured per workflow)

## Node & pnpm Versions
- Node.js: 22.x (LTS)
- pnpm: 9.x

## Branch Targets
Currently configured for:
- `main` (production)
- `develop` (staging)
- `claude/**` (feature branches)

Add more branches to workflow trigger conditions in the `on.push.branches` and `on.pull_request.branches` sections.
