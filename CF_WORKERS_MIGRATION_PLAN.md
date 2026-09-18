# Cloudflare Workers Migration Plan — Piwulangan

> **Status:** Planning (not yet started)
> **Current stack:** Next.js 15.5 (App Router), Prisma 6, SQLite/Turso, NextAuth v5, Tailwind CSS, Vercel deployment
> **Target stack:** Cloudflare Workers (Hono), Prisma + D1 or Turso (Hyperdrive), Better Auth or custom JWT, Tailwind CSS, Cloudflare Pages deployment

---

## Executive Summary

Piwulangan is a ~85%-complete LMS built on Next.js 15 with server components, server actions, NextAuth, Prisma (SQLite/Turso), and deployed to Vercel. Migrating to Cloudflare Workers means replacing the Node.js-centric runtime with an edge-native one.

**Key decision: Two migration paths exist.**

| Path | Approach | Effort | Risk |
|------|----------|--------|------|
| **A. Keep Next.js** | Use `@cloudflare/next-on-pages` to run the existing Next.js app on Cloudflare Pages | Low-Medium | Medium — the adapter has known gaps (some Next.js APIs unsupported, server components may not work as expected, `@prisma/adapter-libsql` native binaries problematic) |
| **B. Rewrite to Hono** | Replace Next.js with Hono framework, rewrite server actions as Hono routes, restructure the app for Workers-native patterns | High | Low — full control, no adapter quirks, idiomatic Cloudflare architecture |

**Recommendation: Path B (Hono rewrite)** — the current codebase relies heavily on Next.js server components, server actions, NextAuth's edge middleware, and `react/cache()` — most of which don't map cleanly to Cloudflare Workers. A clean rewrite avoids fighting the runtime.

---

## Path A: Keep Next.js on Cloudflare Pages (Quick but Fragile)

### Pros
- Minimal code changes (mostly config)
- Preserves server components, server actions, routing
- Tailwind CSS works unchanged

### Cons
- `@cloudflare/next-on-pages` has known limitations:
  - Not all Next.js 15 APIs supported (e.g., `revalidatePath`, ISR may not work)
  - `next/headers` (`cookies()`, `headers()`) behavior differs at the edge
  - Server Components work but with caveats
  - `bcryptjs` needs `nodejs_compat` flag (check compatibility)
  - `@prisma/adapter-libsql` uses native binaries — may not bundle for Workers
- Prisma with Turso via `@prisma/adapter-libsql` may not work in Workers (native WASM compilation needed)
- You're locked into a framework adapter that may lag behind Next.js releases

### Steps (if chosen)
1. Install `@cloudflare/next-on-pages` and `wrangler`
2. Set `compatibility_date` to today, enable `nodejs_compat`
3. Create `wrangler.jsonc` with D1 binding (or Hyperdrive for Turso)
4. Modify `src/lib/db.ts` to use D1-compatible Prisma or Hyperdrive
5. Test each server action for edge compatibility
6. Replace `next start` with `npx wrangler pages deploy`
7. Set up Cloudflare Pages project, configure bindings via dashboard

---

## Path B: Rewrite to Hono on Cloudflare Workers (Thorough, Idiomatic)

### Architecture Overview

```
Browser → Cloudflare Edge (Worker)
            │
            ├─ Hono Router (routes/handlers)
            │    ├─ Auth middleware (JWT verification via KV)
            │    ├─ API routes (/api/*)
            │    ├─ SSR routes (return rendered HTML)
            │    └─ Static assets (Cloudflare Pages)
            │
            ├─ D1 Database (SQLite at the edge) ← replaces Turso
            │    └─ Prisma ORM (with @prisma/adapter-d1) or Drizzle ORM
            │
            ├─ KV Store ← replaces in-memory rate limiter
            │    └─ Rate limiting, session cache
            │
            └─ Queues ← replaces fire-and-forget notifications
                 └─ Email/webhook notifications
```

### What Changes

| Current (Next.js/Vercel) | Target (Hono/Workers) | Migration Strategy |
|---------------------------|----------------------|-------------------|
| Next.js App Router | Hono routes | Reorganize into Hono route groups |
| Server Components (`'use server'`) | Hono handlers (GET/POST) | Rewrite each action as a Hono route |
| Server Actions (`'use server'`) | Hono RPC or REST endpoints | Client components call `fetch()` to Hono routes |
| NextAuth v5 (Credentials) | Better Auth or custom JWT | Use `@cloudflare/workers-oauth-provider` or `better-auth` with D1 |
| Middleware (route guards) | Hono middleware | `app.use('*', authMiddleware)` |
| Prisma + Turso (libsql) | Prisma + D1 (or Turso via Hyperdrive) | `@prisma/adapter-d1` for D1 |
| `react/cache()` | Hono middleware context | Pass data via `c.set()` / `c.get()` |
| `revalidatePath()` | D1 query cache (no-op for dynamic) | Remove cache invalidation; D1 is always fresh |
| `next/headers` (`cookies()`) | Hono's `c.req.header()` / `c.cookie()` | Direct header access |
| `next/font/google` | Static CSS import or self-host Inter | Download Inter font, reference in CSS |
| Tailwind CSS | Tailwind CSS | Build step: `tailwindcss` CLI → `dist/styles.css` |
| i18n (cookie-based) | Same pattern | Cookie parsing in middleware |
| `bcryptjs` | `@nodecrypto/bcrypt-wasm` or Argon2 | WASM bcrypt, or use Web Crypto API |
| Zod validation | Zod (works in Workers) | No change needed |
| `next/image` | `<img>` or `cloudinary-url` | Remove Next.js image optimization |

---

## Detailed Migration Steps (Path B)

### Phase 0: Preparation & Discovery (1-2 days)

- [ ] Audit every server action (`src/actions/*.ts`) — list all DB queries, auth checks, return types
- [ ] Audit every server component (`src/app/**/*.tsx`) — list all `auth()` calls, DB reads, i18n calls
- [ ] Audit middleware (`src/middleware.ts`) — extract route protection logic
- [ ] Audit NextAuth configuration (`src/lib/auth.ts`, `auth.config.ts`) — extract JWT strategy, session shape
- [ ] Document all environment variables currently used
- [ ] Decide on ORM: Prisma (with `@prisma/adapter-d1`) vs Drizzle (lighter, designed for edge)

### Phase 1: Project Setup (1 day)

```bash
# Create new Hono project
npx create-hono@latest piwulangan-workers --template cloudflare-workers
cd piwulangan-workers

# Add dependencies
npm install zod
npm install -D @cloudflare/workers-types

# Initialize D1 database
npx wrangler d1 create piwulangan-db

# Generate Prisma client for D1 (if using Prisma)
npx prisma init --datasource-provider sqlite
```

**wrangler.jsonc structure:**
```jsonc
{
  "name": "piwulangan",
  "main": "src/index.ts",
  "compatibility_date": "2026-08-26",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "piwulangan-db",
      "database_id": "<ID from wrangler d1 create>"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "RATE_LIMIT",
      "id": "<KV namespace ID>"
    }
  ],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

### Phase 2: Database Migration (2-3 days)

**Option A: Keep Prisma with D1 adapter**
```bash
npm install prisma @prisma/client @prisma/adapter-d1
```

- Update `prisma/schema.prisma` to use D1-compatible provider
- Generate D1 SQL from schema: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > schema.sql`
- Apply to D1: `npx wrangler d1 execute piwulangan-db --file=schema.sql`

**Option B: Switch to Drizzle ORM (recommended for Workers)**
```bash
npm install drizzle-orm @cloudflare/workers-types
npm install -D drizzle-kit
```

- Rewrite schema as Drizzle table definitions
- Generate migrations: `npx drizzle-kit generate`
- Apply to D1: `npx drizzle-kit push`

**db.ts rewrite:**
```ts
// With Prisma + D1
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

export function createDb(env: Env) {
  const adapter = new PrismaD1(env.DB);
  return new PrismaClient({ adapter });
}

// OR with Drizzle
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(env: Env) {
  return drizzle(env.DB, { schema });
}
```

**Key difference:** No more singleton pattern (`globalThis`). In Workers, the DB client is created per-request from `env` bindings.

### Phase 3: Auth Migration (2-3 days)

**Current:** NextAuth v5 with Credentials provider, JWT strategy, PrismaAdapter, bcryptjs

**Target options:**

| Option | Pros | Cons |
|--------|------|------|
| **Better Auth** (`better-auth`) | D1 adapter, Credentials provider, JWT, built for edge | New dependency, learning curve |
| **Custom JWT** (jose) | Full control, no dependency | Must implement all auth logic manually |
| **WorkOS / Clerk** | Managed, batteries included | Vendor lock-in, adds cost |

**Recommended: Better Auth with D1 adapter** — it has first-class Cloudflare Workers support and handles credentials providers, sessions, and JWT out of the box.

**Migration steps:**
1. Set up Better Auth with D1 adapter
2. Map the Credentials provider logic (superadmin env-based login, bcrypt compare)
3. Port the session/JWT shape (`{ id, role, email, name }`)
4. Port middleware route guards → Hono middleware
5. Replace `@auth/prisma-adapter` with Better Auth's D1 adapter
6. Move `AUTH_SECRET`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` to Cloudflare secrets

### Phase 4: Route Translation (5-7 days)

Translate every Next.js page and server action to Hono routes.

**Directory structure:**
```
src/
├── index.ts                    # Hono entry point (exports default)
├── middleware/
│   ├── auth.ts                 # JWT verification, role extraction
│   ├── rateLimit.ts            # KV-backed rate limiter
│   └── i18n.ts                 # Cookie-based locale resolver
├── routes/
│   ├── api/
│   │   ├── auth.ts             # POST /api/auth/signup, login, logout
│   │   ├── courses.ts          # CRUD /api/courses
│   │   ├── lessons.ts          # CRUD /api/courses/:id/lessons
│   │   ├── sessions.ts         # CRUD /api/sessions
│   │   ├── announcements.ts    # CRUD /api/announcements
│   │   ├── notifications.ts    # GET /api/notifications, PATCH mark-read
│   │   ├── reports.ts          # CRUD /api/reports
│   │   ├── admin.ts            # Admin-only /api/admin/*
│   │   └── profile.ts          # /api/profile
│   └── pages/
│       ├── index.ts            # Landing → redirect to /login or /dashboard
│       ├── login.tsx           # Render login form (SSR)
│       ├── signup.tsx          # Render signup form (SSR)
│       ├── dashboard.tsx       # Render dashboard (SSR, role-aware)
│       ├── courses.tsx         # Course list (SSR)
│       ├── course-detail.tsx   # Course overview (SSR)
│       ├── schedule.tsx        # Global schedule (SSR)
│       ├── notifications.tsx   # Notifications page (SSR)
│       ├── profile.tsx         # Profile page (SSR)
│       └── admin/
│           ├── users.tsx       # Admin user management (SSR)
│           └── schedule.tsx    # Admin schedule view (SSR)
├── lib/
│   ├── db.ts                   # D1/Prisma client factory
│   ├── auth.ts                 # Better Auth config or custom JWT
│   ├── notifications.ts        # Notification helpers (rewritten)
│   ├── coursePerms.ts          # Permission checks (adapted)
│   ├── phone.ts                # Phone normalization (unchanged)
│   ├── superadmin.ts           # Superadmin helpers (adapted)
│   └── i18n/
│       ├── locales/id.ts       # Unchanged
│       ├── locales/en.ts       # Unchanged
│       └── resolver.ts         # Cookie-based locale (rewritten for Hono)
├── templates/                  # HTML templates (JSX or Hono html)
│   ├── layout.tsx              # Root HTML shell
│   ├── dashboard.tsx           # Dashboard page template
│   └── ...
└── types/
    └── env.ts                  # Generated by `wrangler types`
```

**Example: translating a server action to Hono route**

Current (`src/actions/courses.ts`):
```ts
"use server";
export async function createCourse(formData: FormData) {
  const user = await requireRole("ADMIN", "INSTRUCTOR");
  // ... DB operations
  revalidatePath("/courses");
  return { success: true };
}
```

New (`src/routes/api/courses.ts`):
```ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireRole } from "../middleware/auth";

const courses = new Hono<{ Bindings: Env }>();

courses.use("*", authMiddleware);

courses.post("/", requireRole("ADMIN", "INSTRUCTOR"), async (c) => {
  const db = createDb(c.env);
  const formData = await c.req.formData();
  // ... same logic
  return c.json({ success: true });
});

export default courses;
```

### Phase 5: Client-Side Adaptation (2-3 days)

**Current:** React Server Components + `"use client"` components with `useFormState`/`useFormStatus` calling Server Actions.

**Target:** React components with client-side `fetch()` calls to Hono API routes.

**Changes:**
1. Remove all `"use server"` function calls from client components
2. Replace with `fetch("/api/courses", { method: "POST", body: formData })` calls
3. For SSR pages: use Hono's `html` helper or JSX templates (not React Server Components)
4. Re-implement form submissions as client-side API calls
5. Keep React for interactive components (calendar, modals, forms)
6. Bundle client JS with esbuild or Vite

**Alternative: Use React with Vite for client-side rendering**
- Build a Vite-powered React app for the browser
- Hono serves API routes + initial HTML shell
- Client-side React handles all rendering (SPA mode)
- This is closer to how Cloudflare Workers apps typically work

### Phase 6: Tailwind CSS Setup (0.5 day)

```bash
npm install -D tailwindcss @tailwindcss/cli
```

Build command: `npx @tailwindcss/cli -i src/styles/globals.css -o dist/styles.css`

Reference in HTML: `<link rel="stylesheet" href="/styles.css">`

### Phase 7: i18n Migration (1 day)

The i18n system is cookie-based and already edge-compatible:

- `LocaleProvider.tsx` — client component, no changes needed
- `useT.ts` — client hook, no changes needed
- `serverT.ts` — rewrite to read cookies from Hono context (`c.req.header("cookie")`)

### Phase 8: Deploy & Test (2-3 days)

```bash
# Type check
npx wrangler types
npx tsc --noEmit

# Local dev
npx wrangler dev

# Deploy
npx wrangler deploy

# Apply D1 schema
npx wrangler d1 execute piwulangan-db --remote --file=schema.sql

# Set secrets
npx wrangler secret put AUTH_SECRET
npx wrangler secret put SUPERADMIN_EMAIL
npx wrangler secret put SUPERADMIN_PASSWORD
```

---

## Cloudflare Services Mapping

| Current | Cloudflare Equivalent | Notes |
|---------|----------------------|-------|
| Vercel Serverless Functions | Workers | 10ms CPU time (free) / 30s (paid) |
| Turso (libsql) | D1 (SQLite at edge) | Free tier: 5GB storage, 100K reads/day, 1K writes/day |
| In-memory rate limiter | KV-backed rate limiter | KV has eventual consistency — acceptable for rate limiting |
| Next.js ISR/revalidation | D1 queries (always fresh) | No stale cache pattern needed |
| `react/cache()` | Hono middleware context | `c.set('key', value)` / `c.get('key')` |
| NextAuth session | JWT in HttpOnly cookie | Verify with `jose` or Better Auth |
| Notifications (DB) | D1 (same) | No change — notifications are already in the database |
| `revalidatePath()` | No-op (D1 is always fresh) | Remove all `revalidatePath` calls |

---

## What Stays the Same

- **Prisma schema** (`schema.prisma`) — unchanged (SQLite dialect)
- **Zod validation** — works in Workers
- **i18n dictionaries** (`locales/id.ts`, `locales/en.ts`) — unchanged
- **Phone normalization** (`phone.ts`) — pure function, no change
- **Superadmin constants** (`superadmin.ts`) — unchanged
- **Tailwind CSS design system** (`globals.css`, `tailwind.config.ts`) — unchanged
- **Component structure** — adapt but preserve the Metro design system

---

## What Gets Removed

- `next/headers` (`cookies()`, `headers()`) → Hono equivalents
- `next/cache` (`revalidatePath`, `revalidateTag`) → D1 is always fresh
- `next/navigation` (`useRouter`, `redirect`) → client-side routing or Hono redirects
- `next/font/google` → self-host Inter
- `next/image` → `<img>` or Cloudflare Image Resizing
- Server Components (`"use client"` boundary disappears)
- NextAuth → Better Auth or custom JWT
- `@prisma/adapter-libsql` → `@prisma/adapter-d1` (or Drizzle)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prisma + D1 adapter maturity | Medium — D1 adapter is newer than libsql | Test early; have Drizzle as fallback |
| No Server Components = more client JS | Medium — larger bundle | Use code splitting, lazy load non-critical components |
| D1 write limits (1K/day free) | Low — LMS at ~200 users | Monitor usage; upgrade to paid if needed |
| Workers CPU time limits (10ms free) | Medium — complex queries may exceed | Optimize queries; use paid plan (30s limit) |
| Auth complexity without NextAuth | High — must reimplement from scratch | Use Better Auth (D1-native) or keep minimal custom JWT |
| File assets (JS/CSS) need build step | Low — straightforward with Vite/esbuild | Set up build pipeline early |

---

## Estimated Timeline

| Phase | Duration | Depends On |
|-------|----------|------------|
| Phase 0: Preparation | 1-2 days | — |
| Phase 1: Project Setup | 1 day | Phase 0 |
| Phase 2: Database Migration | 2-3 days | Phase 1 |
| Phase 3: Auth Migration | 2-3 days | Phase 1 |
| Phase 4: Route Translation | 5-7 days | Phase 2, 3 |
| Phase 5: Client Adaptation | 2-3 days | Phase 4 |
| Phase 6: Tailwind Setup | 0.5 day | Phase 1 |
| Phase 7: i18n Migration | 1 day | Phase 4 |
| Phase 8: Deploy & Test | 2-3 days | All above |
| **Total** | **14-21 days** | — |

---

## Recommendation

**Start with Phase 0 (audit) before committing to the full rewrite.** The audit will reveal exactly how many server actions and server components need changes, and whether any patterns are deeply coupled to Next.js in ways that make Workers migration harder than expected.

If the audit shows tight coupling, consider **Path A** (Next.js on Cloudflare Pages) as a stepping stone — deploy the current app on Cloudflare first, then incrementally migrate to Hono in a second pass.

**Next action:** Run the Phase 0 audit — I can generate a complete inventory of every server action, server component, and auth dependency right now.
