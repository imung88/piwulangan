# Phase 0 Audit — Cloudflare Workers Migration

> **Date:** 2026-08-26
> **Codebase:** Piwulangan LMS (Next.js 15.5, Prisma 6, SQLite/Turso, NextAuth v5)

---

## 1. Codebase Inventory

| Category | Count | Details |
|----------|-------|---------|
| **Total TSX files** | 67 | 55 in `src/app/`, 12 in `src/components/` |
| **Total TS files** | ~20 | `src/actions/` (12), `src/lib/` (14), `src/types/` (2) |
| **Server Components** (no `"use client"`) | ~30 | All `page.tsx` files without `"use client"` directive |
| **Client Components** (`"use client"`) | 42 | See §2.2 |
| **Server Actions** (`"use server"`) | 12 files | 17 total directives (12 in action files, 5 inline in page components) |
| **Shared components** | 12 | 5 top-level, 4 schedule, 3 UI primitives |

---

## 2. Next.js API Usage — Complete Catalog

### 2.1 `next/cache` — `revalidatePath` (11 files, ~90 call sites)

**Files importing `revalidatePath`:**
- `src/actions/admin.ts` — 4 calls
- `src/actions/announcements.ts` — 12 calls
- `src/actions/auth.ts` — 0 (but uses `signIn` which does internal redirects)
- `src/actions/courses.ts` — 24 calls
- `src/actions/guardians.ts` — 2 calls
- `src/actions/lessons.ts` — 14 calls
- `src/actions/notifications.ts` — 2 calls
- `src/actions/profile.ts` — 4 calls
- `src/actions/progress.ts` — 3 calls
- `src/actions/reports.ts` — 2 calls
- `src/actions/schedule.ts` — 6 calls (+ 4 via `revalidateScheduleViews` helper)
- `src/actions/sessionSeries.ts` — 4 calls (+ helper)

**Migration:** Remove all `revalidatePath` calls. D1 is always fresh — no ISR/SSG cache to invalidate. Client-side navigation (`router.refresh()` or page reload) handles UI updates.

### 2.2 `next/headers` — `cookies()`, `headers()` (3 files)

| File | Usage | Migration |
|------|-------|-----------|
| `src/actions/auth.ts:16` | `import { headers }` → `clientIp()` for rate limiting | `c.req.header("x-forwarded-for")` in Hono |
| `src/app/(dashboard)/layout.tsx:1` | `cookies()` → read `lang` cookie | `c.req.header("cookie")` + parse in Hono middleware |
| `src/lib/i18n/serverT.ts:17` | `headers()` → read `lang` cookie for server T | Same — read from Hono context |

### 2.3 `next/navigation` — `redirect`, `notFound`, `useRouter`, `usePathname` (48 imports)

**Server-side (page components):**
- `redirect()` — 16 files (all `page.tsx` files that redirect unauthenticated users)
- `notFound()` — 12 files (all `[courseId]` nested pages)

**Client-side (client components):**
- `useRouter()` — 20 files (used for `router.refresh()` after server actions, and `router.push()` for navigation)
- `usePathname()` — 2 files (`MobileNav.tsx`, `LayoutContent.tsx`)

**Migration:**
- `redirect()` → Hono `return c.redirect("/login", 302)`
- `notFound()` → Hono `return c.text("Not Found", 404)` or custom error handler
- `useRouter()` → `window.location` or client-side router (e.g., `@tanstack/react-router` or simple `navigate()`)
- `usePathname()` → client-side `window.location.pathname` or router hook

### 2.4 `next/link` — `Link` component (32 imports)

**Files:** 32 files across components and page files.

**Migration:** Replace with `<a>` tags (SPA mode) or a lightweight client-side router's `<Link>` component.

### 2.5 `next/font/google` — `Inter` (1 file)

- `src/app/layout.tsx:2` — `import { Inter } from "next/font/google"`

**Migration:** Self-host Inter font. Download `.woff2` files, reference in CSS with `@font-face`.

### 2.6 `next/dynamic` (1 file)

- `src/components/schedule/ScheduleView.tsx:4` — `import dynamic from "next/dynamic"` for lazy-loading `WeekCalendar`

**Migration:** Use React `lazy()` + `Suspense`, or Vite code splitting.

### 2.7 `next` — `Metadata` type (1 file)

- `src/app/layout.tsx:1` — `import type { Metadata } from "next"`

**Migration:** Generate `<title>` and `<meta>` tags manually in Hono HTML template.

### 2.8 `next/auth` — NextAuth v5 (5 files)

| File | Import | Purpose |
|------|--------|---------|
| `src/middleware.ts:1` | `import NextAuth from "next-auth"` | Edge auth middleware |
| `src/lib/auth.ts:11-12` | `import NextAuth, Credentials` | Full auth config with PrismaAdapter |
| `src/lib/auth.config.ts:9` | `import type { NextAuthConfig }` | Edge-safe config type |
| `src/actions/auth.ts:23` | `import { AuthError }` | Error handling in signup |
| `src/types/next-auth.d.ts:1` | `import type { DefaultSession }` | Session type augmentation |

**Migration:** Replace entirely with Better Auth (D1 adapter) or custom JWT with `jose`.

### 2.9 `@auth/prisma-adapter` (1 file)

- `src/lib/auth.ts:13` — `import { PrismaAdapter } from "@auth/prisma-adapter"`

**Migration:** Remove. Better Auth has its own D1 adapter, or use manual JWT.

### 2.10 `react-dom` — `useFormStatus` (1 file)

- `src/components/ui/PendingButton.tsx:3` — `import { useFormStatus } from "react-dom"`

**Migration:** Replace with local `useTransition` or custom loading state. `useFormStatus` is tied to React's `<form>` + server action integration.

### 2.11 `react` — `cache()` (1 file)

- `src/lib/appSettings.ts:12` — `import { cache } from "react"` (used for `getAppTitle`)

**Migration:** Remove `cache()` wrapper. In Workers, the module-level singleton pattern (or Hono middleware context) provides equivalent per-request deduplication.

### 2.12 `@prisma/client` — Prisma types (4 files)

| File | Import |
|------|--------|
| `src/lib/db.ts:9` | `PrismaClient` |
| `src/lib/auth.config.ts:10` | `type { Role }` |
| `src/lib/authHelpers.ts:17` | `type { Course, Role }` |
| `src/types/next-auth.d.ts:2` | `type { Role }` |

**Migration:** Keep Prisma with `@prisma/adapter-d1`, or switch to Drizzle. Type imports change to Drizzle schema types.

### 2.13 `@prisma/adapter-libsql` (1 file)

- `src/lib/db.ts:10` — `import { PrismaLibSQL } from "@prisma/adapter-libsql"`

**Migration:** Replace with `@prisma/adapter-d1` for D1, or remove if switching to Drizzle.

### 2.14 `process.env` (5 files, 9 occurrences)

| File | Variables |
|------|-----------|
| `src/middleware.ts:14` | `NODE_ENV` |
| `src/lib/auth.ts:57,59` | `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` |
| `src/lib/db.ts:20,22,24,25,35` | `NODE_ENV`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| `src/lib/superadmin.ts:33` | `SUPERADMIN_EMAIL` |

**Migration:** In Workers, `process.env` → `env` bindings from `wrangler.jsonc` or secrets.

### 2.15 `Math.random()` (1 file — SECURITY)

- `src/actions/courses.ts:38` — `Math.floor(Math.random() * chars.length)` for invite code generation

**Migration:** Replace with `crypto.getRandomValues()` (Web Crypto API) per Workers best practices.

---

## 3. Auth Dependency Map

```
src/middleware.ts
  └─ imports NextAuth(authConfig) → auth() wrapper for route protection
  └─ imports authConfig from lib/auth.config.ts
       └─ imports type NextAuthConfig from "next-auth"
       └─ imports type Role from "@prisma/client"

src/lib/auth.ts
  └─ imports NextAuth, Credentials, PrismaAdapter
  └─ imports bcryptjs (compare, hash)
  └─ imports crypto.timingSafeEqual
  └─ imports db from lib/db.ts
  └─ imports authConfig from lib/auth.config.ts
  └─ exports: handlers, signIn, signOut, auth

src/lib/authHelpers.ts
  └─ imports auth from lib/auth.ts (calls auth() for session)
  └─ imports db, serverT, canManageCourse, isCourseOwner
  └─ exports: requireUser, requireRole, requireCourseManager, requireCourseOwner

src/actions/auth.ts
  └─ imports signIn, signOut from lib/auth.ts
  └─ imports AuthError from "next-auth"
  └─ imports bcryptjs (hash)
  └─ imports headers from "next/headers"

src/lib/auth.config.ts
  └─ Edge-safe config (no Prisma, no bcryptjs)
  └─ Used by middleware only

src/types/next-auth.d.ts
  └─ Augments DefaultSession with role + id
```

**Auth replacement strategy:**
1. Replace NextAuth with Better Auth (D1 adapter) or custom JWT with `jose`
2. `auth()` calls → JWT verification middleware in Hono
3. `signIn()` / `signOut()` → custom login/logout endpoints
4. Session shape `{ user: { id, role, email, name } }` → same shape in JWT
5. Middleware route guards → Hono middleware with role checks

---

## 4. bcryptjs Usage (3 files)

| File | Functions | Purpose |
|------|-----------|---------|
| `src/lib/auth.ts:14` | `compare`, `hash` | Verify login password, hash superadmin password |
| `src/actions/auth.ts:14` | `hash` | Hash password on signup |
| `src/actions/admin.ts:21` | `hash` | Hash password on user creation/reset |
| `src/actions/profile.ts:16` | `compare`, `hash` | Verify current password, hash new password |

**Migration:** bcryptjs works with `nodejs_compat` flag in Workers, but is slow in the V8 isolate. Options:
1. Keep bcryptjs with `nodejs_compat` (functional but ~2-5x slower than native)
2. Switch to Argon2 (WASM, better security, similar speed)
3. Switch to Web Crypto `PBKDF2` (fast, native, but different hash format — requires migration)

---

## 5. Server Actions → API Route Mapping

Every `"use server"` function must become a Hono route handler.

| Current Action File | Exported Functions | Hono Route Group | HTTP Method |
|---------------------|-------------------|------------------|-------------|
| `actions/auth.ts` | `signup`, `login`, `logout` | `/api/auth/*` | POST |
| `actions/courses.ts` | 15 functions (create, update, publish, enroll, etc.) | `/api/courses/*` | GET/POST/PATCH/DELETE |
| `actions/lessons.ts` | 9 functions (CRUD modules, lessons, resources) | `/api/lessons/*` | POST/PATCH/DELETE |
| `actions/progress.ts` | `toggleProgress` | `/api/progress` | POST |
| `actions/schedule.ts` | 11 functions (sessions, attendance, availability) | `/api/sessions/*` | POST/PATCH/DELETE |
| `actions/sessionSeries.ts` | 6 functions (recurring sessions) | `/api/series/*` | POST/PATCH/DELETE |
| `actions/announcements.ts` | 4 functions (CRUD + pin) | `/api/announcements/*` | POST/PATCH/DELETE |
| `actions/notifications.ts` | 3 functions (fetch, mark read) | `/api/notifications/*` | GET/PATCH |
| `actions/reports.ts` | 3 functions (CRUD) | `/api/reports/*` | POST/PATCH/DELETE |
| `actions/profile.ts` | 3 functions (update profile, app title, password) | `/api/profile/*` | POST/PATCH |
| `actions/admin.ts` | 6 functions (user management) | `/api/admin/*` | GET/POST/PATCH |
| `actions/guardians.ts` | 4 functions (link/unlink/query) | `/api/guardians/*` | POST/GET/DELETE |

**Total: 74 server action functions → 74 API route handlers**

---

## 6. Client Component → Server Component Boundary Analysis

### 6.1 `"use client"` Components (42 files)

These are already client-side and mostly work in Workers as-is (they just need the server action calls replaced with `fetch()`):

**Shared components (12 files):**
- `Toast.tsx`, `PendingButton.tsx`, `ConfirmDialog.tsx` — UI primitives
- `MobileNav.tsx`, `NotificationBell.tsx`, `LanguageSelector.tsx`, `RoleBadge.tsx` — App chrome
- `ScheduleView.tsx`, `WeekCalendar.tsx`, `SessionList.tsx`, `AvailabilityDisplay.tsx` — Schedule
- `PublishCourseButton.tsx` — Action button

**Page client components (30 files):**
- `LayoutContent.tsx` — Dashboard shell
- `DashboardClient.tsx` — Dashboard content
- `CoursesClient.tsx`, `BrowseCourses.tsx` — Course lists
- `NewCourseForm.tsx` — Course creation
- `ProfileContent.tsx`, `AdminUsersClient.tsx` — Profile/admin
- `NotificationsClient.tsx` — Notifications
- Various `*Client.tsx`, `*Form.tsx`, `*Actions.tsx` in `[courseId]/` — 20 files

### 6.2 Server Components (no `"use client"` — ~30 files)

These do data fetching at request time and render HTML. In Workers, they become Hono route handlers that:
1. Fetch data from D1
2. Render HTML (via JSX templates or `html` helper)
3. Return the HTML response

Key server component patterns:
- `auth()` calls for session data → JWT verification middleware
- `db.*` queries for data → D1 queries via Prisma or Drizzle
- `serverT()` for i18n → Hono context-based locale resolver
- `redirect()` / `notFound()` → Hono redirects / 404 responses
- `params` (Promise in Next.js 15) → route parameters in Hono

---

## 7. `@/types/errors.ts` — Shared Types (NO migration needed)

```ts
export type ActionResult<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { success: false; error: string; fieldErrors?: FieldErrors };
```

This type is framework-agnostic. Keep as-is. Server action return types become API response types.

---

## 8. Inline Server Actions in Page Components

5 inline `"use server"` blocks exist in page components:

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx:202` | Inline lesson delete action |
| `src/app/(dashboard)/courses/[courseId]/manage/settings/page.tsx:190` | Inline course delete action |
| `src/app/(dashboard)/courses/[courseId]/manage/settings/page.tsx:206` | Inline course archive action |
| `src/app/(dashboard)/courses/[courseId]/manage/settings/page.tsx:220` | Inline course unarchive action |
| `src/app/(dashboard)/courses/[courseId]/manage/settings/page.tsx:237` | Inline course publish/unpublish action |

**Migration:** Move to corresponding Hono API routes (these already have equivalents in `actions/courses.ts`).

---

## 9. Files That Need NO Migration (Framework-Agnostic)

| File | Reason |
|------|--------|
| `src/types/errors.ts` | Pure TypeScript types |
| `src/lib/phone.ts` | Pure functions (normalizePhone, isEmail) |
| `src/lib/superadmin.ts` | Pure functions + one `process.env` read → `env` binding |
| `src/lib/scheduleUtils.ts` | Pure date utility functions |
| `src/lib/coursePerms.ts` | Pure permission logic (uses `db` but no Next.js imports) |
| `src/lib/notifications.ts` | Pure DB logic (uses `db` but no Next.js imports) |
| `src/lib/i18n/locales/id.ts` | Static dictionary |
| `src/lib/i18n/locales/en.ts` | Static dictionary |
| `src/lib/i18n/useT.ts` | Client hook (no Next.js imports, just React) |
| `src/components/ui/Toast.tsx` | Pure React |
| `src/components/ui/ConfirmDialog.tsx` | Pure React |
| `src/components/ui/PendingButton.tsx` | Uses `useFormStatus` from `react-dom` — needs minor change |
| `src/components/RoleBadge.tsx` | Pure React |
| `src/components/LanguageSelector.tsx` | Pure React |
| `src/components/schedule/WeekCalendar.tsx` | Pure React + `next/link` |
| `src/components/schedule/SessionList.tsx` | Pure React + `next/link` |
| `src/components/schedule/AvailabilityDisplay.tsx` | Pure React |
| `src/app/globals.css` | Pure CSS (Tailwind) |
| `tailwind.config.ts` | Build config |
| `eslint.config.mjs` | Build config |

---

## 10. Summary: Migration Effort by Area

| Area | Files to Change | Effort | Notes |
|------|----------------|--------|-------|
| **Server Actions → API routes** | 12 action files + 5 inline | 🔴 High | 74 functions to convert |
| **Server Components → SSR handlers** | ~30 page files | 🔴 High | Data fetching + HTML rendering |
| **Auth (NextAuth → Better Auth/Custom)** | 5 files | 🔴 High | Complete auth rewrite |
| **Middleware** | 1 file | 🟡 Medium | Route guards + CSP → Hono middleware |
| **`next/link` → `<a>` or router** | 32 files | 🟡 Medium | Mechanical replacement |
| **`useRouter` → client router** | 20 files | 🟡 Medium | `router.refresh()` → refetch; `router.push()` → navigate |
| **`redirect()`/`notFound()`** | 16 files | 🟢 Low | Hono equivalents |
| **`revalidatePath` removal** | 11 files | 🟢 Low | Just delete the calls |
| **`next/headers` → Hono context** | 3 files | 🟢 Low | Direct mapping |
| **`next/font` → self-host Inter** | 1 file | 🟢 Low | Download font files |
| **`next/dynamic` → React.lazy** | 1 file | 🟢 Low | Simple swap |
| **bcryptjs → WASM or PBKDF2** | 4 files | 🟡 Medium | Hash format migration |
| **`Math.random()` → Web Crypto** | 1 file | 🟢 Low | Security fix |
| **`process.env` → `env` bindings** | 5 files | 🟢 Low | Workers env pattern |
| **Prisma → D1 adapter or Drizzle** | `db.ts` + schema | 🟡 Medium | Adapter swap or ORM switch |
| **Shared components (no change)** | 15+ files | ✅ None | Framework-agnostic |
