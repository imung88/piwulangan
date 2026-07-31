# Architecture — Piwulangan

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 15.5 (App Router) | Full-stack React, SSR, file-based routing, great DX |
| **Language** | TypeScript | Type safety, better DX, catches bugs early |
| **Database** | SQLite (local file) → Turso (libSQL) in production | Zero-setup local dev, serverless-friendly hosted SQLite, free tier, works with Prisma |
| **ORM** | Prisma | Type-safe queries, great migration tooling |
| **Auth** | NextAuth.js v5 (Auth.js) | Built for Next.js, handles sessions + credentials |
| **Styling** | Tailwind CSS | Utility-first, mobile-first, small bundle ("Metro" design system, tokens in `globals.css`) |
| **Deployment** | Vercel | Serverless, free tier, zero ops |
| **Validation** | Zod | Runtime validation + TypeScript inference |

**Not included (by design):**

- No file storage — all resources are external links
- No Docker/self-hosting in v1
- No email service — in-app notifications only

---

## Project Structure

```
piwulangan/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data for development
│   └── migrations/            # Auto-generated migrations
│
├── src/
│   ├── app/                   # Next.js App Router (pages)
│   │   ├── (auth)/            # Auth group (login, signup)
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/       # Authenticated routes
│   │   │   ├── dashboard/     # Role-aware home
│   │   │   ├── announcements/ # Global announcements (sidebar link)
│   │   │   │
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx           # Course list
│   │   │   │   ├── new/page.tsx       # Create course
│   │   │   │   └── [courseId]/
│   │   │   │       ├── page.tsx       # Course overview
│   │   │   │       ├── lessons/
│   │   │   │       │   └── [lessonId]/page.tsx
│   │   │   │       ├── announcements/ # Per-course announcements (view + inline manage for owners)
│   │   │   │       ├── members/
│   │   │   │       ├── schedule/      # Per-course sessions (list + week calendar)
│   │   │   │       │   └── [sessionId]/  # Individual session: view + manage
│   │   │   │       └── manage/        # Instructor/admin
│   │   │   │           ├── content/
│   │   │   │           ├── students/
│   │   │   │           ├── schedule/  # Compact overview + create session
│   │   │   │           └── settings/
│   │   │   │
│   │   │   ├── schedule/              # Core: always on
│   │   │   │   ├── page.tsx           # Single role-aware view (admin sees all courses)
│   │   │   │   └── availability/      # Instructor: set hours + blocked dates
│   │   │   │
│   │   │   ├── notifications/         # In-app notification list
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   └── users/             # Admin: user management
│   │   │   │
│   │   │   └── profile/               # Own profile; superadmin also edits the app title here
│   │   │
│   │   ├── layout.tsx         # Root layout (generateMetadata + AppTitleProvider, DB-driven app title)
│   │   ├── page.tsx           # Landing / redirect
│   │   └── globals.css
│   │
│   ├── components/            # Shared components (NotificationBell, MobileNav,
│   │   │                      #   LanguageSelector, RoleBadge, schedule/*, ui/*)
│   │   ├── schedule/          # Calendar, session list, availability display
│   │   └── ui/                # Metro primitives: ConfirmDialog, Toast, PendingButton
│   │
│   ├── lib/
│   │   ├── auth.ts            # NextAuth (Credentials provider + Prisma adapter)
│   │   ├── auth.config.ts     # Edge-safe NextAuth config (used by middleware)
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── schedule.ts        # Session queries (per role/course)
│   │   ├── notifications.ts   # Notification helpers
│   │   ├── appSettings.ts     # App title read (AppSetting key-value table, React cache)
│   │   ├── AppTitleContext.tsx # Client context providing the app title to UI
│   │   ├── coursePerms.ts     # Course permission checks
│   │   ├── phone.ts           # Phone number normalization
│   │   ├── rateLimit.ts       # Rate limiting helpers
│   │   ├── superadmin.ts      # Env-based superadmin identity helpers
│   │   ├── i18n/              # Cookie-based locale module (no URL prefix)
│   │   │   ├── LocaleProvider.tsx  # React Context + cookie reader
│   │   │   ├── useT.ts            # Client t("key.path") hook
│   │   │   ├── serverT.ts         # Server: getServerT() / serverT()
│   │   │   └── locales/
│   │   │       ├── id.ts          # Bahasa Indonesia (default)
│   │   │       └── en.ts          # English
│   │
│   ├── actions/               # Server Actions
│   │   ├── auth.ts            # Login, signup
│   │   ├── courses.ts         # Course CRUD, enrollment
│   │   ├── lessons.ts         # Module/lesson CRUD
│   │   ├── schedule.ts        # Session CRUD, attendance, availability, blocked dates
│   │   ├── progress.ts        # Mark complete
│   │   ├── announcements.ts   # Announcement CRUD
│   │   ├── notifications.ts   # Fetch/mark-read notifications
│   │   ├── guardians.ts       # Guardian-student linking
│   │   ├── profile.ts         # Own profile, password; app title (superadmin only)
│   │   ├── reports.ts         # Student reports
│   │   └── admin.ts           # Admin actions
│   │
│   ├── middleware.ts          # Auth gate + role-based route guards
│   └── types/                 # Shared TypeScript types
│       └── next-auth.d.ts
│
├── .env.example
├── .env.local                 # (gitignored)
├── next.config.mjs
├── eslint.config.mjs          # ESLint 9 flat config (FlatCompat + eslint-config-next)
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Key Architecture Decisions

### 1. Server Components First

Default to React Server Components (RSC). Only use `"use client"` when you need interactivity (forms, modals, calendar clicks). This keeps the client bundle small.

```
Server Component (default) → reads data, renders HTML
Client Component ("use client") → handles user interaction
```

### 2. Server Actions for Mutations

No REST API routes for CRUD. Use Next.js Server Actions for:
- Creating/editing courses and lessons
- Creating/editing sessions and availability
- Marking lessons complete
- Managing users and guardian links

This eliminates API boilerplate and keeps mutations co-located with their forms.

### 3. Auth via NextAuth.js v5

```
Credentials provider (email + password)
  → bcrypt for password hashing
  → JWT session strategy
  → Middleware for route protection
  → Role stored in JWT token: ADMIN | INSTRUCTOR | STUDENT | GUARDIAN
```

Role-based route protection lives in `src/middleware.ts`: public routes (`/`, `/login`, `/signup`), admin-only `/admin/*`, and a read-only allowlist for guardians (no `/courses/*/manage`). The middleware uses `src/lib/auth.config.ts` — an edge-safe NextAuth config with no Prisma adapter or bcryptjs — so the middleware bundle stays small.

### 4. Database: SQLite + Prisma (Turso in production)

Local development uses a plain SQLite file (`prisma/dev.db`) — no database server. Production (Vercel) will use Turso, a hosted libSQL/SQLite service, since Vercel's filesystem is ephemeral.

- Free tier: generous storage/reads, far beyond this app's needs
- Same SQLite dialect locally and in production — schema and migrations are shared
- Production connects via `@prisma/adapter-libsql` (driver adapter); local uses Prisma's built-in SQLite connector
- See `MIGRATION.md` for the Postgres → SQLite migration details and the Turso deployment plan

### 5. No File Storage

All resources are external links. This eliminates:
- S3/blob storage configuration
- File upload validation and virus scanning
- Storage costs
- CDN configuration

Instructors paste Google Drive links. Students submit text or URLs.

### 6. Course-Centric Scheduling (Core)

Scheduling is always on. There is no slot-computation/booking engine — instructors and admins create `ClassSession` records directly (via `src/actions/schedule.ts`), and `src/lib/schedule.ts` provides role-aware read queries:

```
getSessionsForCourse(courseId)
getSessionsForStudent(studentId, opts)     // via session attendees
getSessionsForStudents(studentIds, opts)   // guardian view
getSessionsForInstructor(instructorId, opts)
getAllSessions(opts)                       // admin calendar
getCourseAvailability(courseId)            // instructor availability + blocked dates
```

Instructor availability (`Availability`) and `BlockedDate` records are informational — shown when planning sessions, not enforced by a booking flow.

**Single consolidated view:** `/schedule` is the one role-aware entry point (list + week calendar). There is no separate admin schedule route — admins see all courses (with a course-card grid) in the same view. Every session is clickable from both the list and the week calendar.

**Individual session page:** `/courses/[courseId]/schedule/[sessionId]` renders one session. It reuses the course schedule page's permission model (`canManageCourse` / enrolled / guardian). Anyone with access can view it; managers edit details, roster, attendance, and cancel from this page. The per-course Manage Schedule page (`manage/schedule`) is a compact overview + create-session form only — per-session work lives on the detail page.

**Attendance:** managers record per-attendee status (Present / Late / Absent) plus free-text notes, with a "Mark all present" shortcut. Lock rules mirror the actions' server-side checks: attendance is editable on the session date and past sessions only; details/roster are editable on today and future dates only; cancelled sessions are read-only for everyone.

**Multi-teacher support:** Each course has one instructor. The admin can schedule sessions across different instructors; the admin calendar queries all instructors' sessions side by side.

### 7. Internationalization (id/en)

Cookie-based locale (`lang`), no URL prefix. Bahasa Indonesia is the default.

- **Client components:** `const t = useT()` (`src/lib/i18n/useT.ts`); interpolate with `format(t("key"), { n })`.
- **Server components:** `const t = await getServerT()` **once per page**, then call `t("key.path")` synchronously (`src/lib/i18n/serverT.ts`). Avoid per-string `await serverT(...)` — it re-resolves the locale on every call.
- **Server actions:** `await serverT("errors.key")` for error messages is fine (low volume).
- All strings live in `src/lib/i18n/locales/{id,en}.ts` with a shared key structure.

### 8. Mobile-First UX Conventions

Primary users are non-technical people on phones. Conventions enforced across the app:

- **Touch targets ≥ 44px** for all interactive controls (attendance buttons, row action menus, form submits).
- **Tables become card lists on mobile:** data tables are wrapped in `hidden md:block overflow-x-auto`, with a parallel `md:hidden` card list (`divide-y divide-metro-border`). See `manage/students/page.tsx` and `admin/users/AdminUsersClient.tsx`.
- **Optimistic updates for attendance:** `SessionDetailClient` updates local state immediately, re-syncs via `useEffect` after `router.refresh()`, and reverts + toasts on failure.
- **Shared UI primitives** in `src/components/ui/`: `ConfirmDialog` (replaces `window.confirm` on destructive actions), `Toast`, and `PendingButton` (`useFormStatus`-based submit button for server-action forms).
- **Route-group boundaries:** `(dashboard)/loading.tsx` (Metro skeleton) and `(dashboard)/error.tsx` (localized retry card) cover all authenticated pages.
- **Deep links:** dashboard session cards link straight to `/courses/{courseId}/schedule/{sessionId}` so instructors can mark attendance in one tap.
- **Role colors (app-wide standard):** admin = purple, instructor = navy blue, student = Metro green, guardian = deep yellow. Tokens: `--metro-role-{admin,instructor,student,guardian}` in `globals.css` (+ Tailwind `metro-role-*`). Always render roles through `<RoleBadge>` (or its exported `ROLE_BADGE_STYLES` map) in `src/components/RoleBadge.tsx` — never inline role colors.

---

## Data Flows

### Session Management Flow (Admin creates session)

```
Admin                     Server                     Database
  │                          │                           │
  ├─ Create session ────────►│                           │
  │   (date, time, course,   ├─ Validate instructor ────►│
  │    instructor, students) │◄─ OK ─────────────────────┤
  │                          ├─ Check for conflicts ────►│
  │                          │◄─ No conflicts ───────────┤
  │                          ├─ Insert session ─────────►│
  │                          │◄─ Created ────────────────┤
  │◄─ Session created ───────┤                           │
  │                          │                           │
  │                          ├─ Notify students ────────►│ (in-app)
```

### Progress Tracking Flow

```
Student                    Server                     Database
  │                          │                           │
  ├─ Click "Mark Complete" ─►│                           │
  │                          ├─ Upsert progress ────────►│
  │                          │◄─ Done ───────────────────┤
  │◄─ Update UI (checkmark) ─┤                           │
  │                          │                           │
  │                          ├─ Recalculate course % ────►│
  │◄─ Update progress bar ───┤                           │
```

### Guardian View Flow

```
Guardian                   Server                     Database
  │                          │                           │
  ├─ Open dashboard ────────►│                           │
  │                          ├─ Query linked students ──►│
  │                          │◄─ Student IDs ────────────┤
  │                          ├─ Query enrollments ──────►│
  │                          ├─ Query progress ─────────►│
  │                          ├─ Query schedule ─────────►│
  │                          │◄─ All data ───────────────┤
  │◄─ Render dashboard ──────┤                           │
  │   (read-only, no actions)│                           │
```

---

## Deployment

### Vercel (Primary)

**Setup:**

1. Fork/clone the repo on GitHub
2. Connect to Vercel
3. Create a Turso database (free tier) and auth token
4. Set environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `NEXTAUTH_URL`)
5. Deploy

**Vercel free tier limits:**

| Resource | Limit | Impact |
|---|---|---|
| Serverless functions | 100GB-hours/month | More than enough for 200 users |
| Function execution | 10s max | Sufficient for all operations |
| Function memory | 1024MB | More than enough |
| Bandwidth | 100GB/month | Text-heavy LMS uses very little |

**Turso free tier:** hosted SQLite with storage and read/write quotas far beyond ~200 users of a text-based LMS.

### Environment Variables

```env
# .env.example

# Database (local SQLite file; production uses Turso env vars instead)
DATABASE_URL=file:./dev.db

# Auth
AUTH_SECRET=generate-a-random-string-here
NEXTAUTH_URL=http://localhost:3000  # set to your Vercel URL in production
```

### Local Development

See [SETUP.md](./SETUP.md) for the full local setup guide (migrations, seed data, test accounts). No Docker or database server needed — the DB is a local SQLite file.

---

## Performance

**Targets:**

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Initial JS bundle | < 150KB (gzipped) |
| Database queries per page | < 5 |
| Lighthouse score | > 90 (Performance, Accessibility) |

**Practices in place (2026-07):**

- Server pages resolve translations once via `getServerT()` (no per-string await waterfalls).
- Independent DB queries run in `Promise.all` (dashboard, courses pages).
- Session (`role`, `userName`) is passed from the server layout to the client shell — no client-side `/api/auth/session` fetch.
- Notifications are polled once per 60s in the layout and shared with `NotificationBell` via props.
- Middleware uses the edge-safe `auth.config.ts` (no Prisma/bcryptjs in the middleware bundle).

**Deferred:** Prisma query reshaping (`select`/`_count`); splitting large client components (`ManageScheduleClient`, `AdminUsersClient`, `DashboardClient`); locale-splitting the client i18n bundle (~38 KB for both dictionaries).

---

## Security Checklist

- [ ] All routes protected by middleware (role-based)
- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] CSRF protection via Server Actions
- [ ] SQL injection prevented by Prisma (parameterized queries)
- [ ] XSS prevented by React (auto-escaping)
- [ ] Rate limiting on auth endpoints
- [ ] HTTP-only cookies for session
- [ ] Soft-delete (no hard deletes)
- [ ] Guardian can only view linked students' data
- [ ] Student can only view enrolled courses
- [ ] Instructor can only manage own courses
