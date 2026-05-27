# ESLint Configuration Guide

**Created**: 27 May 2026  
**Status**: ✅ Global ESLint configuration implemented across all workspaces

---

## Overview

This project uses a **unified ESLint configuration** across all workspaces:
- **Root**: `.eslintrc.json` — Shared base configuration
- **Per-workspace**: Each workspace extends the root config with environment-specific rules

---

## Configuration Structure

```
.eslintrc.json                          # Root config (TypeScript, imports, general rules)
├─ services/api/.eslintrc.json          # Extends root + Node.js specific
├─ apps/web/.eslintrc.json              # Extends root + React + Next.js
├─ apps/mobile/.eslintrc.json           # Extends root + React + React Native
├─ packages/schemas/.eslintrc.json      # Extends root (pure TypeScript)
├─ packages/core/.eslintrc.json         # Extends root + any utilities
└─ packages/ui/.eslintrc.json           # Extends root + React
```

---

## Root Configuration Rules

### TypeScript Rules
- **`@typescript-eslint/explicit-function-return-types`** (warn) — Functions should have explicit return types
- **`@typescript-eslint/no-explicit-any`** (warn) — Avoid `any` type
- **`@typescript-eslint/no-unused-vars`** (warn) — Unused variables, allow `_` prefix for intentionally unused
- **`@typescript-eslint/no-floating-promises`** (error) — Async operations must be awaited or handled
- **`@typescript-eslint/no-misused-promises`** (error) — Promise types must be used correctly
- **`@typescript-eslint/await-thenable`** (error) — Only await Promises
- **`@typescript-eslint/prefer-nullish-coalescing`** (warn) — Prefer `??` over `||` for nullish checks
- **`@typescript-eslint/prefer-optional-chain`** (warn) — Use optional chaining `?.` when possible

### Import Rules
- **`import/order`** (warn) — Organize imports in groups:
  1. Builtin modules (`fs`, `path`, etc.)
  2. External packages (`react`, `@nestjs/common`, etc.)
  3. Internal (`@imbobi/*` imports)
  4. Parent directory (`../`)
  5. Sibling files (`./`)
  6. Index files (`.`)
- **Alphabetized** within each group, case-insensitive

### General Rules
- **`no-console`** (warn) — Avoid `console.log()`, only allow `warn` and `error`
- **`prefer-const`** (warn) — Use `const` instead of `let` when possible
- **`no-var`** (error) — Never use `var`, use `const` or `let`

### Test Files Override
- Files matching `*.spec.ts` or `*.test.ts` have relaxed rules:
  - Jest environment enabled
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
pnpm lint -- src/modules/auth/auth.service.ts
```

---

## Workspace-Specific Rules

### API (NestJS)
**Environment**: Node.js  
**Extensions**: BaseConfig + Node.js specific

```json
{
  "env": {
    "node": true,
    "es2022": true
  }
}
```

### Web (Next.js)
**Environment**: Browser + Node.js (SSR)  
**Extensions**: BaseConfig + React + Next.js

```json
{
  "env": {
    "browser": true,
    "es2022": true
  },
  "extends": [
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@next/next/recommended"
  ]
}
```

Rules:
- `react/react-in-jsx-scope` — Disabled (not needed in Next.js)
- `@next/next/no-img-element` — Use Next.js Image component

### Mobile (Expo/React Native)
**Environment**: React Native  
**Extensions**: BaseConfig + React + React Native

```json
{
  "env": {
    "es2022": true,
    "react-native/react-native": true
  },
  "extends": [
    "plugin:react-native/all"
  ]
}
```

Rules:
- `react-native/no-color-literals` — Use color constants
- `react-native/no-inline-styles` — Avoid inline styles

### Schemas & Core (Pure TypeScript)
**Environment**: Node.js  
**Extensions**: BaseConfig only

---

## Ignoring Files

Add patterns to `.eslintignore`:
```
node_modules
dist
build
.next
coverage
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

## Common Issues & Fixes

### Issue: "Cannot find tsconfig.json"
**Solution**: Add `parserOptions.tsconfigRootDir` in workspace config:
```json
{
  "parserOptions": {
    "project": "tsconfig.json",
    "tsconfigRootDir": "."
  }
}
```

### Issue: ESLint can't resolve `@imbobi/*` imports
**Solution**: Already configured in root `.eslintrc.json` via `import/order` plugin:
```json
{
  "pathGroups": [
    {
      "pattern": "@imbobi/**",
      "group": "internal",
      "position": "before"
    }
  ]
}
```

### Issue: React/JSX not recognized
**Solution**: Check workspace config includes React plugins and settings:
```json
{
  "plugins": ["react", "react-hooks"],
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
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

## Extending Configuration

To add rules to a workspace, extend the local `.eslintrc.json`:

```json
{
  "extends": ["../../.eslintrc.json"],
  "rules": {
    "@typescript-eslint/explicit-function-return-types": "error"
  }
}
```

To override root rules:
```json
{
  "rules": {
    "no-console": "off"
  }
}
```

---

## Maintenance

### Checking for Outdated Plugins
```bash
pnpm outdated @typescript-eslint/eslint-plugin
pnpm outdated eslint-plugin-react
```

### Updating ESLint
```bash
pnpm add -D eslint@latest
pnpm add -D @typescript-eslint/eslint-plugin@latest
pnpm add -D @typescript-eslint/parser@latest
```

### Running Full Lint
```bash
pnpm lint -- --fix
```

---

## Severity Levels

- **error** (🔴) — Blocks CI/CD, must be fixed
- **warn** (🟡) — Shown in logs, should be fixed
- **off** (⚪) — Disabled, can be overridden locally

---

## References

- [ESLint Documentation](https://eslint.org/docs/rules/)
- [@typescript-eslint Documentation](https://typescript-eslint.io/rules/)
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react)
- [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import)

---

**Configuration Status**: ✅ Complete  
**Coverage**: 6 workspaces  
**Last Updated**: 27 May 2026
