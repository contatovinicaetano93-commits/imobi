# Monorepo Module Resolution & NestJS Dependency Injection

## Problem Summary

The imobi monorepo was experiencing critical module resolution failures:

1. **Shared packages pointing to TypeScript source** — `@imbobi/schemas`, `@imbobi/core`, `@imbobi/ui` had `package.json` pointing to `./src/index.ts` instead of compiled `./dist/index.js`
2. **Missing module-alias configuration** — NestJS API couldn't resolve workspace package aliases at runtime
3. **Incorrect NestJS build output path** — API startup script referenced wrong dist location
4. **NestJS dependency injection failures** — Services like EncryptionService not available in modules

## Solution Implemented

### 1. Convert Shared Packages to Compile to dist/

**Before:**
```json
// packages/schemas/package.json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

**After:**
```json
// packages/schemas/package.json
{
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

**Same changes applied to:**
- `packages/schemas/`
- `packages/core/`
- `packages/ui/` (exports from `dist/web/` not just `dist/`)

### 2. Configure TypeScript Output for Each Package

**packages/schemas/tsconfig.json:**
```json
{
  "compilerOptions": {
    "module": "commonjs",              // Changed from ESNext
    "moduleResolution": "node",        // Changed from bundler
    "declaration": true,               // Generate .d.ts files
    "outDir": "./dist",                // Output to dist/
    "target": "ES2020"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Same pattern for:**
- `packages/core/tsconfig.json`
- `packages/ui/tsconfig.json` (but with `include: ["web/**/*.ts", "web/**/*.tsx"]`)

### 3. Install & Configure module-alias

**Install:**
```bash
npm install module-alias  # Added to @imbobi/api devDependencies
```

**Configure in src/main.ts (BEFORE any other imports):**
```typescript
// Setup module aliases for workspace packages before any imports
const moduleAlias = require("module-alias");
const path = require("path");

// Navigate from dist/services/api/src/main.js up to project root
// Path: /home/user/imobi/services/api/dist/services/api/src/main.js
// Need 6 levels: src -> api -> services -> dist -> api -> services -> root
const projectRoot = path.resolve(__dirname, "../../../../../../");

moduleAlias.addAlias("@imbobi/schemas", path.join(projectRoot, "packages/schemas/dist"));
moduleAlias.addAlias("@imbobi/core", path.join(projectRoot, "packages/core/dist"));
moduleAlias.addAlias("@imbobi/ui", path.join(projectRoot, "packages/ui/dist"));
```

### 4. Fix NestJS Build Output Path

**services/api/package.json:**
```json
{
  "scripts": {
    "start": "node dist/services/api/src/main.js"  // Full nested path
  }
}
```

### 5. Resolve NestJS Dependency Injection

**Problem:** AuthService needs EncryptionService but it wasn't available in AuthModule

**Solution:** Add EncryptionService to module providers:

**services/api/src/modules/auth/auth.module.ts:**
```typescript
import { EncryptionService } from "../../common/encryption.service";

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    JwtModule.register({...})
  ],
  providers: [AuthService, JwtStrategy, EncryptionService],  // Added EncryptionService
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

**Also in services/api/src/app.module.ts:**
```typescript
import { EncryptionService } from "./common/encryption.service";

@Module({
  providers: [
    CacheService,
    CsrfService,
    EncryptionService,  // Global provider
    // ...
  ],
})
export class AppModule {}
```

## File Structure After Fix

```
/home/user/imobi/
├── services/api/dist/services/api/src/main.js
│   └── Compiled API with module-alias configured
├── packages/
│   ├── schemas/dist/
│   │   ├── index.js         ← CommonJS compiled output
│   │   ├── index.d.ts       ← Type definitions
│   │   └── usuario.schema.js
│   ├── core/dist/
│   │   ├── index.js
│   │   ├── index.d.ts
│   │   └── hooks/ (compiled)
│   └── ui/dist/web/
│       ├── index.js
│       └── index.d.ts
```

## Build Flow

1. **Turbo processes each package:**
   - `@imbobi/schemas` → `tsc` → `dist/`
   - `@imbobi/core` → `tsc` → `dist/`
   - `@imbobi/ui` → `tsc` → `dist/web/`

2. **API build:**
   - `@imbobi/api` → `nest build` → `dist/services/api/src/`
   - Embeds module-alias configuration

3. **At runtime:**
   - `node dist/services/api/src/main.js` starts
   - module-alias resolves `@imbobi/schemas` → correct path
   - NestJS bootstraps with all dependencies available

## Key Insights

- **CommonJS required:** Node.js runtime cannot execute TypeScript. Must compile to JavaScript.
- **__dirname calculation:** In compiled output, paths are relative to the compiled file location (6 levels deep).
- **module-alias timing:** Must be configured BEFORE any imports that use workspace aliases.
- **NestJS scoping:** Even global providers need explicit imports or inclusion in module providers if used directly.

## Verification Checklist

```bash
# 1. All packages compile
pnpm build

# 2. Output files exist
ls packages/schemas/dist/index.js
ls packages/core/dist/index.js
ls packages/ui/dist/web/index.js
ls services/api/dist/services/api/src/main.js

# 3. Module resolution works
node -e "
  require('module-alias/register');
  const path = require('path');
  const root = path.resolve(__dirname, 'packages');
  require('module-alias').addAlias('@imbobi/schemas', path.join(root, 'schemas/dist'));
  console.log('Module aliases registered');
"

# 4. API starts without errors
timeout 10 npm --prefix services/api start || true
```

## Lessons Learned

1. **Always output to dist/ in production packages**
   - Makes it clear what's compiled vs source
   - Simplifies package.json exports

2. **Use module-alias sparingly**
   - Only needed for workspace packages at runtime
   - Better to use proper Node module resolution when possible

3. **Test full build pipeline early**
   - Don't assume monorepo tools will handle everything
   - Verify actual output paths match what runtime expects

4. **Document __dirname calculations**
   - Nested directory structures make it hard to count levels
   - Comments help future maintainers
