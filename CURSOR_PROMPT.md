# 🚀 CURSOR: START HERE

**Your Role**: Frontend implementation partner for Claude on Imobi fintech platform  
**Your Focus**: UI/UX, React components, user experience  
**Your Status**: Read-only until you finish reading this file  

---

## ⚡ TL;DR — Copy This Into Cursor

```
I am your collaborative partner on the Imobi fintech platform. 
My role is to implement backend architecture, database, and core services.
Your role is to implement frontend features, user interfaces, and mobile app.

I have prepared:
✅ Complete architecture (ARCHITECTURE_RESILIENCE_API_FIRST.md)
✅ API endpoints ready for integration
✅ Type-safe Zod schemas for validation
✅ Development rules and code patterns (.cursorrules)

You should:
1. Read CLAUDE.md (project overview)
2. Read .cursorrules (your development guide)
3. Read ARCHITECTURE_RESILIENCE_API_FIRST.md (system design)
4. Check COLLABORATIVE_WORKSPACE.md (track progress)
5. Pick ONE priority to implement
6. Follow type-safe patterns exactly
7. Update progress tracker when done
8. Commit to: claude/imobi-mvp-fintech-status-jrr2ab

Let's build this together.
```

---

## 📖 READ IN THIS ORDER

### 1️⃣ CLAUDE.md (5 min read)
**What**: Project overview, tech stack, essential commands  
**Why**: Understand what you're building and how to run it  
**Location**: `/home/user/imobi/CLAUDE.md`

Key sections:
- Stack: Next.js 14, NestJS, PostgreSQL, Redis
- Commands: `pnpm dev`, `pnpm type-check`, `pnpm build`
- Packages: @imbobi/schemas, @imbobi/core, @imbobi/ui
- Critical rules: No hardcoded secrets, GPS validation layers, async with BullMQ

### 2️⃣ .cursorrules (10 min read)
**What**: Your development rules, code patterns, best practices  
**Why**: Follow exact patterns for type safety & consistency  
**Location**: `/home/user/imobi/.cursorrules`

Key sections:
- Type Safety First: No `any` type, use specific types
- API First Design: Use Zod schemas as source of truth
- Code Patterns: NestJS service example, React component example
- Resilience: Circuit breaker, retry, timeout, bulkhead
- Security: Authorization, validation, secrets, audit logging
- Testing: Type-check must pass before commit

### 3️⃣ ARCHITECTURE_RESILIENCE_API_FIRST.md (15 min read)
**What**: Complete system architecture and design patterns  
**Why**: Understand how to implement scalable, resilient features  
**Location**: `/home/user/imobi/ARCHITECTURE_RESILIENCE_API_FIRST.md`

Key sections:
- Section 3: Resilience patterns with code examples
- Section 4: Scalability (stateless, sharding, caching)
- Section 5: API-First (OpenAPI 3.0, versioning, rate limiting)
- Section 7: Security (zero-trust, encryption, audit logs)

### 4️⃣ COLLABORATIVE_WORKSPACE.md (5 min read)
**What**: Shared progress tracker, workflow, priorities  
**Why**: Know what's done, what's next, and how to track progress  
**Location**: `/home/user/imobi/COLLABORATIVE_WORKSPACE.md`

Key sections:
- Phase 1: ✅ Complete (architecture, documentation, reviews)
- Phase 2: 🔧 Build & deployment readiness
- Phase 3: ⏳ Features (pick ONE to start)
- Recent Activity: What was just done
- Progress Tracker: Update checkboxes as you complete work

---

## 🎯 YOUR PRIORITIES (Pick ONE)

### Priority A: Fix Next.js SSR Build Error
**Status**: ⚠️ Pre-existing, non-blocking  
**Blocker**: Build fails on /404 and /500 pages during prerendering  
**Why**: Makes local testing easier, though Vercel handles it fine  
**Effort**: 1-2 hours

**What to do**:
1. Investigate why useRef is being called during SSR
2. Check dashboard layout hooks usage
3. Prevent error pages from being statically prerendered
4. Verify `pnpm build` completes successfully

**Reference**: DETAILED_REVIEW_REPORT.md (section: "CRITICAL BUILD ISSUE")

---

### Priority B: Dashboard Layout & Navigation
**Status**: ⏳ Ready for implementation  
**Features**: Responsive sidebar, top nav, role-based menu  
**Why**: Foundation for all dashboard features  
**Effort**: 3-4 hours

**What to do**:
1. Review current layout in `apps/web/app/(dashboard)/layout.tsx`
2. Implement responsive design (mobile-first)
3. Add theme switcher (light/dark mode)
4. Create component library for nav items
5. Test with different user roles

**Reference**: `.cursorrules` (React component pattern section)

---

### Priority C: KYC Document Upload Component
**Status**: ⏳ Ready for implementation  
**Features**: Drag-drop upload, preview, S3 storage  
**Why**: Critical for user registration flow  
**Effort**: 4-5 hours

**What to do**:
1. Create component in `apps/web/app/(dashboard)/dashboard/kyc`
2. Implement drag-drop with file validation
3. Connect to Claude's API: `POST /api/kyc/upload`
4. Show upload progress and preview
5. Handle errors gracefully

**Reference**: API endpoint defined in ARCHITECTURE_RESILIENCE_API_FIRST.md (Section 5)

---

### Priority D: Property Search Interface
**Status**: ⏳ Ready for implementation  
**Features**: Search, filtering, map view, property cards  
**Why**: Core user-facing feature  
**Effort**: 5-6 hours

**What to do**:
1. Create search page in `apps/web/app/(dashboard)/dashboard/obras`
2. Implement filter bar (location, price, size, status)
3. Show results as cards or list
4. Add map integration (Google Maps or similar)
5. Detail view on property click

**Reference**: `CLAUDE.md` (GPS validation section), API endpoints in ARCHITECTURE_RESILIENCE_API_FIRST.md

---

### Priority E: Mobile App Navigation (React Native)
**Status**: ⏳ Ready for implementation  
**Features**: Bottom tab bar, stack navigation, role-based routes  
**Why**: Essential for mobile experience  
**Effort**: 4-5 hours

**What to do**:
1. Configure Expo Router in `apps/mobile`
2. Create bottom tab navigator
3. Implement role-based route protection
4. Connect authentication flow
5. Test on iOS and Android simulators

**Reference**: `apps/mobile` directory, CLAUDE.md (Mobile section)

---

## ⚙️ BEFORE YOU START: SETUP CHECKLIST

- [ ] `cd /home/user/imobi`
- [ ] `pnpm install` (first time only)
- [ ] `pnpm type-check` (should show 0 errors)
- [ ] `pnpm dev` (start web + API, should see green checkmarks)
- [ ] Open browser: `http://localhost:3000` (should load homepage)

If all green ✅, you're ready to start developing.

---

## 🔧 DEVELOPMENT WORKFLOW

### For Each Feature:

1. **Plan** (5 min)
   - Read architecture section relevant to feature
   - Check `.cursorrules` for code patterns
   - Look at existing similar components

2. **Implement** (varies by priority)
   - Create component files
   - Follow patterns exactly (types, error handling, logging)
   - Use Zod schemas from @imbobi/schemas
   - Add error boundaries for safety

3. **Test** (10 min)
   - `pnpm type-check` (0 errors required)
   - `pnpm dev` and test feature in browser
   - Test on mobile if React Native

4. **Commit** (5 min)
   - `git add <files>`
   - `git commit -m "feat: [Feature name]"`
   - `git push origin claude/imobi-mvp-fintech-status-jrr2ab`
   - Update COLLABORATIVE_WORKSPACE.md progress

### Command Reference

```bash
# Start development
pnpm dev

# Type checking (MUST pass before commit)
pnpm type-check

# Linting
pnpm lint
pnpm lint --fix

# Build for production
pnpm build

# Database
pnpm db:migrate
pnpm db:generate

# Git workflow
git status
git add <files>
git commit -m "feat: Description"
git push origin claude/imobi-mvp-fintech-status-jrr2ab
```

---

## 🚀 COMMUNICATION PROTOCOL

### How to Report Progress
1. Update checkbox in COLLABORATIVE_WORKSPACE.md
2. Add entry in "Recent Activity" section
3. Commit and push

Example:
```markdown
### 2026-06-22 — Dashboard Layout Work
- ✅ Implemented responsive sidebar
- ✅ Added role-based menu filtering
- ⏳ Theme switcher (in progress)
- 🐛 Mobile nav collapse has animation jank (needs fixing)
```

### If You Get Stuck
1. Document the blocker in COLLABORATIVE_WORKSPACE.md under "Known Issues"
2. Push your work anyway (incomplete is OK)
3. Include error messages and what you tried

Example:
```markdown
## Known Issues

### Dashboard SSR Error on /404 Page
**What**: useRef being called during server-side rendering
**Where**: Building /404 page during static generation
**Tried**: 
  - Added 'use client' directive (no effect)
  - Set dynamic = 'force-dynamic' (no effect)
  - Removed custom error handlers (persisted)
**Next**: Check dashboard layout for leaked client-side hooks
```

---

## ✅ QUALITY REQUIREMENTS (Non-Negotiable)

### Type Safety
- ✅ `pnpm type-check` must pass (0 errors)
- ✅ Use specific types, never use `any`
- ✅ Zod schemas for all validation
- ✅ Props typed with TypeScript interfaces

### Code Style
- ✅ Follow `.cursorrules` patterns exactly
- ✅ Use Tailwind for styling
- ✅ Component naming: PascalCase
- ✅ File naming: kebab-case for routes, PascalCase for components

### Security
- ✅ No hardcoded secrets or API keys
- ✅ Always validate user input with Zod
- ✅ Check user permissions before rendering sensitive data
- ✅ Use HttpOnly cookies for auth tokens

### Documentation
- ✅ JSDoc on complex functions
- ✅ Type exports for reusable components
- ✅ README in new packages

---

## 🎓 EXAMPLE: Adding a Feature

Let's say you want to implement the KYC upload component.

### Step 1: Read Architecture (5 min)
```
Open ARCHITECTURE_RESILIENCE_API_FIRST.md
Jump to Section 5: API-First Design
Find the KYC document endpoint
Note: POST /api/kyc/upload, expects multipart/form-data, returns uploadId + signedUrl
```

### Step 2: Check Code Patterns (5 min)
```
Open .cursorrules
Look at: "React Component (Frontend)" example
Note: Use useApi hook for fetching, handle loading/error states
```

### Step 3: Implement Component (60 min)
```typescript
// apps/web/app/(dashboard)/dashboard/kyc/_components/DocumentUpload.tsx

"use client";

import { useState } from "react";
import { useApi } from "@imbobi/core";
import { kycDocumentSchema } from "@imbobi/schemas";
import type { z } from "zod";

export function DocumentUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const { mutate: upload, loading, error } = useApi(
    async (formData: FormData) => {
      const res = await fetch("/api/kyc/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    []
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files));
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    files.forEach(file => formData.append("documents", file));
    await upload(formData);
  };

  return (
    <div onDrop={handleDrop} className="border-2 border-dashed p-8">
      {loading ? <p>Enviando...</p> : <p>Arraste arquivos aqui</p>}
      {error && <p className="text-red-500">{error.message}</p>}
      <button onClick={handleSubmit} disabled={loading}>
        Enviar
      </button>
    </div>
  );
}
```

### Step 4: Type Check (2 min)
```bash
pnpm type-check
# Output: ✅ All packages passed
```

### Step 5: Test (10 min)
```bash
pnpm dev
# Open http://localhost:3000/dashboard/kyc
# Drag files → Should upload and show success
```

### Step 6: Commit (5 min)
```bash
git add apps/web/app/(dashboard)/dashboard/kyc/_components/DocumentUpload.tsx
git commit -m "feat: Add document upload component with drag-drop support"
git push origin claude/imobi-mvp-fintech-status-jrr2ab
```

### Step 7: Update Progress (2 min)
```markdown
# In COLLABORATIVE_WORKSPACE.md
### 2026-06-22 — KYC Document Upload Complete
- ✅ Implemented drag-drop component
- ✅ Connected to /api/kyc/upload endpoint
- ✅ Type-safe with Zod validation
- ✅ Error handling + loading states
- ✅ Tested on web (mobile testing next)
```

---

## 🆘 COMMON ISSUES & SOLUTIONS

### Issue: `pnpm type-check` fails with "Cannot find module"
**Solution**: Run `pnpm install` then `pnpm db:generate` to regenerate Prisma types

### Issue: `pnpm dev` doesn't start the API
**Solution**: API might be on a different port. Check terminal output. Default is http://localhost:3001

### Issue: Tailwind styles not applying
**Solution**: Make sure file path is included in `apps/web/tailwind.config.ts` content patterns

### Issue: Zod validation errors
**Solution**: Check `packages/schemas/src/*.ts` for schema definition. Use `z.parse()` for strict validation

### Issue: API returns 401 Unauthorized
**Solution**: Check auth token in cookie. Login first, then make requests

---

## 🎯 WHEN YOU'RE DONE (Soft Launch Readiness)

Once you complete your priority:
1. Update all checkboxes in COLLABORATIVE_WORKSPACE.md
2. Commit final work
3. Run full test suite: `pnpm type-check && pnpm lint`
4. Verify `pnpm dev` still works
5. Create a summary of what you built

---

## 📞 QUICK REFERENCE

| What | Where | Command |
|------|-------|---------|
| Start dev | Your terminal | `pnpm dev` |
| Check types | Your terminal | `pnpm type-check` |
| View schemas | `packages/schemas/src/` | Read `.ts` files |
| See patterns | `.cursorrules` | Search for "React Component" |
| Track progress | `COLLABORATIVE_WORKSPACE.md` | Update checkboxes |
| Read architecture | `ARCHITECTURE_RESILIENCE_API_FIRST.md` | Jump to section |
| Deploy | Vercel Dashboard | Set env vars, click Deploy |

---

**Ready to start? Pick a priority above and begin!**

Questions? Reference COLLABORATIVE_WORKSPACE.md for common Q&A.

Good luck! 🚀
