# Branch Policy — imbobi

## Overview
This document establishes the branch naming conventions, lifecycle, and cleanup procedures for the imbobi monorepo.

## Main Branches

### Production
- **Branch**: `main`
- **Purpose**: Production-ready code, deployed to all users
- **Protection**: 
  - Requires PR reviews before merge
  - All CI/CD checks must pass
  - No force-pushes allowed
  - Only maintainers can merge

### Staging
- **Branch**: `develop` (create if not exists)
- **Purpose**: Pre-production testing, staging deployments
- **Protection**:
  - Requires PR reviews before merge
  - All CI/CD checks must pass
  - Feature-complete code only
  - QA verification required before merge

## Feature Branches

### Naming Convention
```
feature/<kebab-case-description>       # New features
fix/<kebab-case-description>           # Bug fixes
refactor/<kebab-case-description>      # Refactoring
docs/<kebab-case-description>          # Documentation
chore/<kebab-case-description>         # Maintenance tasks
perf/<kebab-case-description>          # Performance improvements
test/<kebab-case-description>          # Test additions
```

### Examples
- `feature/comercial-dashboard` — New dashboard feature
- `fix/gps-validation-error` — Bug fix for GPS validation
- `refactor/auth-module` — Refactoring authentication
- `docs/deployment-guide` — Documentation update
- `chore/upgrade-dependencies` — Dependency update
- `perf/optimize-database-queries` — Performance improvement

### Claude-Generated Branches
Claude Code branches use auto-generated suffixes:
```
claude/<description>-<ID>   # e.g., claude/serene-pasteur-mB72T
```
These follow the same kebab-case principle for the description part.

## Branch Lifecycle

### Creation
1. Create branch from `develop` (or `main` for hotfixes)
2. Use descriptive naming following conventions above
3. Keep branches focused on single issues/features
4. Update branch regularly with upstream changes

### Active Development
- Commits should be atomic and well-described
- Link commits to issue tracker when applicable
- Rebase on `develop` regularly to avoid large conflicts
- Run `pnpm type-check` before pushing (pre-push hook enforced)

### Code Review
- Create PR with clear description and context
- Link related issues
- Ensure all CI/CD checks pass
- Request reviews from relevant team members
- Address feedback promptly

### Merge & Cleanup
1. After approval and passing CI/CD:
   - Use **Squash** or **Rebase** merge (not Create Merge Commit)
   - Delete branch after merge (both local and remote)
   - Confirm deletion in GitHub

2. Commands for cleanup:
   ```bash
   # Delete local branch
   git branch -d <branch-name>
   
   # Delete remote branch
   git push origin --delete <branch-name>
   
   # Verify cleanup
   git branch -a
   ```

## Archive Branches

For historical reference, branches with significant work can be archived instead of deleted:

### Naming
```
archived/<original-branch-name>/<date>
```

### Example
```bash
git checkout -b archived/feature-old-feature/2026-06-03
git push origin archived/feature-old-feature/2026-06-03
```

### Purpose
- Preserve branch history for reference
- Easily restore if needed
- Keeps `main` namespace clean

### Cleanup of Archive
- Review annually
- Delete if no longer needed
- Document why archived branch was kept

## Rules & Best Practices

### Do's
- ✅ Use descriptive branch names (kebab-case)
- ✅ Keep branches focused on single concerns
- ✅ Delete branches after merge
- ✅ Rebase feature branches on `develop`
- ✅ Run `pnpm type-check` before pushing
- ✅ Link PRs to relevant issues
- ✅ Keep commits atomic and descriptive

### Don'ts
- ❌ Don't commit directly to `main` or `develop`
- ❌ Don't leave stale branches orphaned
- ❌ Don't use `main/` or `develop/` as feature prefixes
- ❌ Don't force-push to shared branches
- ❌ Don't merge without passing CI/CD
- ❌ Don't use generic names like `test`, `wip`, `temp`
- ❌ Don't keep feature branches alive for months

## CI/CD Integration

### Pre-Push Checks
The repository enforces pre-push validation:
```bash
pnpm type-check    # TypeScript validation across all packages
```

Failures block push until resolved.

### GitHub Actions
All PRs trigger:
- Type checking
- Linting
- Unit tests
- Security audits (on security-sensitive branches)
- Build validation

## Cleanup Schedule

### Weekly
- Review open PRs
- Ensure merged branches are deleted
- Monitor stale branches (>2 weeks without activity)

### Monthly
- Review branch list
- Archive old feature branches if appropriate
- Document any exceptions

## Example Workflow

### Feature Development
```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/new-dashboard

# 2. Development (regular commits)
git commit -m "feat: implement new dashboard header"
git commit -m "feat: add dashboard filters"

# 3. Keep updated with main
git fetch origin
git rebase origin/develop

# 4. Push and create PR
git push -u origin feature/new-dashboard
# Create PR on GitHub

# 5. After PR merged
git checkout develop
git pull origin develop
git branch -d feature/new-dashboard              # local delete
git push origin --delete feature/new-dashboard   # remote delete
```

### Hotfix Workflow
```bash
# 1. Create from main
git checkout main
git pull origin main
git checkout -b fix/critical-security-issue

# 2. Fix and test
git commit -m "fix: patch security vulnerability"

# 3. Push and create urgent PR
git push -u origin fix/critical-security-issue

# 4. After merge to main (and backport to develop)
git branch -d fix/critical-security-issue
git push origin --delete fix/critical-security-issue
```

## Questions & Exceptions

### Can I create a branch for experimentation?
Yes, but use `temp/` prefix and delete within 1 week:
```bash
git checkout -b temp/experiment-new-library
# ... work ...
git branch -d temp/experiment-new-library  # delete locally
```

### What if I need to revert a merge?
```bash
git revert -m 1 <merge-commit-sha>
```
Create a new commit documenting the reversion.

### Can I keep a branch long-term?
Only if documented in `archived/`. Long-term branches should be tracked as issues instead.

## Related Documents
- `CLAUDE.md` — Project architecture and setup
- `DEPLOYMENT_GUIDE.md` — Deployment procedures
- `.github/pull_request_template.md` — PR template
- GitHub branch protection rules (in repository settings)

---

**Last Updated**: 2026-06-03
**Version**: 1.0
**Maintained By**: Development Team
