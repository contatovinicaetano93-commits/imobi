# ESLint Configuration Guide

**Updated**: 27 May 2026  
**Status**: ✅ ESLint v10 flat config implemented across all workspaces

---

## Overview

This project uses **ESLint v10 with flat config format** across all workspaces:
- **Root**: `eslint.config.js` — Shared base configuration in ESM format
- **Monorepo**: Single unified configuration applies to all packages
- **Format**: Flat config (ESLint v9+) - not the legacy `.eslintrc.json`

---

## Configuration Structure

```
eslint.config.js                 # Root config (applies to all packages)
├─ TypeScript ESLint rules       # Via typescript-eslint package
├─ Built-in JS rules             # Via @eslint/js
└─ Package.json lint scripts     # Each workspace runs: eslint src --ext .ts
    ├─ services/api/package.json
    ├─ apps/web/package.json
    ├─ apps/mobile/package.json
    ├─ packages/schemas/package.json
    ├─ packages/core/package.json
    └─ packages/ui/package.json
```

**Note**: No workspace-specific configs needed. ESLint v10 automatically uses the root config for all packages.

---

## Root Configuration Rules

### TypeScript Rules
- **`@typescript-eslint/no-explicit-any`** (warn) — Avoid `any` type (disabled in tests)
- **`@typescript-eslint/no-unused-vars`** (warn) — Unused variables, allow `_` prefix
- **`@typescript-eslint/no-floating-promises`** (error) — Async operations must be awaited
- **`@typescript-eslint/no-misused-promises`** (error) — Promise types must be used correctly
- **`@typescript-eslint/prefer-nullish-coalescing`** (warn) — Prefer `??` over `||`
- **`@typescript-eslint/prefer-optional-chain`** (warn) — Use optional chaining `?.`

### General Rules
- **`no-console`** (warn) — Avoid `console.log()`, only allow `warn` and `error`
- **`prefer-const`** (warn) — Use `const` instead of `let` when possible
- **`no-var`** (error) — Never use `var`, use `const` or `let`

### Test Files Override
- Files matching `*.spec.ts` or `*.test.ts`:
  - `@typescript-eslint/no-explicit-any` disabled (common in tests)

---

## Running ESLint

### Lint All Workspaces
```bash
pnpm lint
```

Lints all packages using Turbo caching.

### Lint Specific Workspace
```bash
pnpm --filter @imbobi/api lint
pnpm --filter @imbobi/web lint
pnpm --filter @imbobi/mobile lint
```

### Fix Auto-Fixable Issues
```bash
pnpm lint -- --fix
```

Or in a specific workspace:
```bash
pnpm --filter @imbobi/api lint -- --fix
```

### Check Specific Files
```bash
pnpm lint -- services/api/src/modules/auth/auth.service.ts
```

---

## Current Lint Status

### Passing Packages ✅
- `@imbobi/schemas` — 4 warnings (nullish coalescing style)
- `@imbobi/core` — 3 warnings (unused imports, nullish coalescing)
- `@imbobi/api` — Passing (0 errors)
- `@imbobi/web` — Passing (0 errors)
- `@imbobi/ui` — Passing (0 errors)

### Needs Fixes ⚠️
- `@imbobi/mobile` — 46 problems (19 errors, 27 warnings)
  - Promise-returning functions as event handlers
  - Floating promises not awaited
  - Unused variables

To fix mobile issues:
```bash
pnpm lint -- --fix
# Then manually fix remaining errors with:
pnpm --filter @imbobi/mobile lint
```

---

## Ignoring Files

ESLint ignores files listed in `.eslintignore`:
```
node_modules
dist
build
.next
.turbo
coverage
.env
.env.*
*.log
.DS_Store
```

Or in code:
```typescript
/* eslint-disable */
// Code here is ignored
/* eslint-enable */
```

For specific rules:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const value: any = something;
```

---

## Extending Configuration

The root `eslint.config.js` uses ESLint's flat config format:

```javascript
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules', 'dist', ...],
  },
  // Base recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Custom rules for all TypeScript files
    files: ['**/*.ts', '**/*.tsx'],
    rules: { ... },
  },
  {
    // Test-specific overrides
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: { ... },
  }
);
```

To add custom rules for a workspace, add them to the `rules` object in the config.

---

## Common Issues & Fixes

### Issue: "Unexpected any" warnings
**Solution**: This is intentional. Mark unused vars with `_` prefix:
```typescript
const _unused: any = value;
```

Or disable for specific lines:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const value: any = something;
```

### Issue: Import order not enforced
**Solution**: `eslint-plugin-import` is incompatible with ESLint v10 as of May 2026. We've removed it for now. Import organization is best-effort via code review.

### Issue: "Promise-returning function provided to attribute"
**Solution**: When passing async functions to event handlers, wrap with callback:
```typescript
// ❌ Wrong
<button onClick={async () => { await doSomething(); }}>Click</button>

// ✅ Correct
<button onClick={() => void doSomething()}>Click</button>
```

---

## Integration with CI/CD

### GitHub Actions
Add to workflow:
```yaml
- name: Lint code
  run: pnpm lint
```

### Pre-commit Hook
Add to `.husky/pre-commit`:
```bash
pnpm lint
```

### VSCode Integration
Install ESLint extension:
```
dbaeumer.vscode-eslint
```

Create `.vscode/settings.json`:
```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Severity Levels

- **error** (🔴) — Blocks CI/CD, must be fixed
- **warn** (🟡) — Shown in logs, should be fixed
- **off** (⚪) — Disabled, can be overridden locally

---

## Next Steps

1. **Fix mobile linting issues** — 19 errors blocking CI
2. **Update documentation** — Add ESLint as pre-commit hook
3. **Monitor style warnings** — Nullish coalescing (`??`) usage
4. **Consider import plugin** — Once `eslint-plugin-import` v3 supports ESLint v10

---

## References

- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/migration-guide)
- [@typescript-eslint Rules](https://typescript-eslint.io/rules/)
- [typescript-eslint Quick Start](https://typescript-eslint.io/getting-started/)

---

**Configuration Status**: ✅ Functional  
**ESLint Version**: 10.4.0  
**Last Updated**: 27 May 2026
