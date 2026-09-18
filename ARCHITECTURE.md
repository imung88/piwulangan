# Architecture — Piwulangan

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 15.5.22 (App Router) | Full-stack React, SSR, file-based routing, great DX |
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
│   │   │   ├── dashboard/     # Role-aware home (DashboardClient.tsx)
│   │   │   ├── announcements/ # Global announcements (sidebar link)
│   │   │   │
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx           # Course list (CoursesClient.tsx)
│   │   │   │   ├── BrowseCourses.tsx  # Student course catalog
│   │   │   │   ├── new/page.tsx       # Create course (NewCourseForm.tsx)
│   │   │   │   └── [courseId]/
│   │   │   │       ├── page.tsx       # Course overview
│   │   │   │       ├── CourseActionsMenu.tsx  # Dropdown actions for course managers
│   │   │   │       ├── CopyInviteCode.tsx     # Invite code copy button
│   │   │   │       ├── PreviewEnroll.tsx      # Enrollment preview for non-enrolled
│   │   │   │       ├── UnenrollButton.tsx     # Student self-unenroll
│   │   │   │       ├── lessons/
│   │   │   │       │   └── [lessonId]/page.tsx
│   │   │   │       ├── announcements/         # Per-course announcements
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── AnnouncementItem.tsx
│   │   │   │       │   └── CreateAnnouncementForm.tsx
│   │   │   │       ├── members/               # Course member list
│   │   │   │       ├── reports/               # Student progress reports
│   │   │   │       │   ├── page.tsx           # Reports viewer (student/guardian/manager)
│   │   │   │       │   └── attendance/        # Attendance record page
│   │   │   │       │       └── page.tsx
│   │   │   │       ├── schedule/              # Per-course sessions (list + week calendar)
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   └── [sessionId]/       # Individual session: view + manage
│   │   │   │       │       ├── page.tsx
│   │   │   │       │       └── SessionDetailClient.tsx
│   │   │   │       └── manage/                # Instructor/admin management
│   │   │   │           ├── content/           # Module/lesson/resource CRUD
│   │   │   │           │   ├── page.tsx
│   │   │   │           │   ├── AddContentForms.tsx
│   │   │   │           │   └── LessonEditForm.tsx
│   │   │   │           ├── students/          # Roster management
│   │   │   │           │   ├── page.tsx
│   │   │   │           │   └── StudentActions.tsx
│   │   │   │           ├── schedule/          # Compact overview + create session
│   │   │   │           │   ├── page.tsx
│   │   │   │           │   └── ManageScheduleClient.tsx
│   │   │   │           ├── reports/           # Report management (create/edit/delete)
│   │   │   │           │   ├── page.tsx
│   │   │   │           │   └── ReportsManageClient.tsx
│   │   │   │           └── settings/          # Course settings (details, teachers, archive)
│   │   │   │               ├── page.tsx
│   │   │   │               ├── CourseDetailsForm.tsx
│   │   │   │               └── TeacherActions.tsx
│   │   │   │
│   │   │   ├── schedule/              # Core: always on
│   │   │   │   ├── page.tsx           # Single role-aware view (admin sees all courses)
│   │   │   │   └── availability/      # Instructor: set hours + blocked dates
│   │   │   │       ├── page.tsx
│   │   │   │       ├── AvailabilityForm.tsx
│   │   │   │       ├── WeeklyAvailabilitySection.tsx
│   │   │   │       └── BlockedDatesSection.tsx
│   │   │   │
│   │   │   ├── notifications/         # In-app notification list
│   │   │   │   ├── page.tsx
│   │   │   │   └── NotificationsClient.tsx
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   └── users/             # Admin: user management
│   │   │   │       ├── page.tsx
│   │   │   │       └── AdminUsersClient.tsx
│   │   │   │
│   │   │   ├── profile/               # Own profile; superadmin also edits the app title here
│   │   │   │   ├── page.tsx
│   │   │   │   └── ProfileContent.tsx
│   │   │   │
│   │   │   ├── LayoutContent.tsx      # Client shell: desktop sidebar + mobile header
│   │   │   ├── error.tsx              # Route-group error boundary (localized)
│   │   │   └── loading.tsx            # Route-group loading skeleton (Metro)
│   │   │
│   │   ├── layout.tsx         # Root layout (generateMetadata + AppTitleProvider, DB-driven app title)
│   │   ├── page.tsx           # Landing / redirect
│   │   └── globals.css
│   │
│   ├── components/            # Shared components
│   │   ├── LanguageSelector.tsx       # Locale switcher (cookie-based)
│   │   ├── MobileNav.tsx             # Mobile bottom tab navigation (role-aware)
│   │   ├── NotificationBell.tsx      # Bell icon with unread badge (60s polling)
│   │   ├── PublishCourseButton.tsx    # Course publish/unpublish toggle
│   │   ├── RoleBadge.tsx             # Colored role badge (admin=purple, instructor=navy, etc.)
│   │   ├── schedule/                 # Calendar, session list, availability display
│   │   │   ├── types.ts              # SessionItem type and shared schedule interfaces
│   │   │   ├── WeekCalendar.tsx
│   │   │   ├── SessionList.tsx
│   │   │   ├── ScheduleView.tsx      # List ⇄ calendar toggle (dynamic import of WeekCalendar)
│   │   │   └── AvailabilityDisplay.tsx
│   │   └── ui/                       # Metro primitives
│   │       ├── ConfirmDialog.tsx     # Replaces window.confirm on destructive actions
│   │       ├── Toast.tsx             # Toast notification system
│   │       └── PendingButton.tsx     # useFormStatus-based submit button
│   │
│   ├── lib/
│   │   ├── auth.ts            # NextAuth (Credentials provider + Prisma adapter)
│   │   ├── auth.config.ts     # Edge-safe NextAuth config (used by middleware)
│   │   ├── authHelpers.ts     # Shared auth/authz guards (requireUser, requireRole, requireCourseManager)
│   │   ├── db.ts              # Prisma client singleton (env-aware: SQLite local, Turso production)
│   │   ├── schedule.ts        # Session queries (per role/course)
│   │   ├── scheduleUtils.ts   # Date parsing/validation helpers (parseDateOnly, isPastDate, toDateStr)
│   │   ├── notifications.ts   # Notification helpers (notify, withGuardians)
│   │   ├── appSettings.ts     # App title read (AppSetting key-value table, React cache)
│   │   ├── AppTitleContext.tsx # Client context providing the app title to UI
│   │   ├── coursePerms.ts     # Course permission checks (canManageCourse, isCourseOwner)
│   │   ├── phone.ts           # Phone number normalization (E.164)
│   │   ├── rateLimit.ts       # In-memory sliding-window rate limiter
│   │   ├── superadmin.ts      # Env-based superadmin identity helpers
│   │   ├── i18n/              # Cookie-based locale module (no URL prefix)
│   │   │   ├── LocaleProvider.tsx  # React Context + cookie reader
│   │   │   ├── useT.ts            # Client t("key.path") hook
│   │   │   ├── serverT.ts         # Server: getServerT() / serverT()
│   │   │   └── locales/
│   │   │       ├── id.ts          # Bahasa Indonesia (default)
│   │   │       └── en.ts          # English
│   │
│   ├── actions/               # Server Actions (all "use server")
│   │   ├── auth.ts            # Login, signup, logout
│   │   ├── courses.ts         # Course CRUD, enrollment (open/code/manual, unenroll), archive
│   │   ├── lessons.ts         # Module + Lesson CRUD, resources
│   │   ├── schedule.ts        # Sessions (create/update/cancel/attendees/attendance), availability
│   │   ├── sessionSeries.ts   # Recurring session series (create/update/cancel, exceptions)
│   │   ├── progress.ts        # Mark complete / unmark
│   │   ├── announcements.ts   # Announcement CRUD + pin (+ notifications)
│   │   ├── notifications.ts   # Fetch/mark-read notifications
│   │   ├── guardians.ts       # Guardian-student linking (link, unlink, query)
│   │   ├── profile.ts         # Own profile + password; app title (superadmin only)
│   │   ├── reports.ts         # Student reports (create/update/delete)
│   │   └── admin.ts           # User management (create, edit, deactivate, reset password)
│   │
│   ├── middleware.ts          # Auth gate + role-based route guards + CSP headers
│   └── types/                 # Shared TypeScript types
│       ├── errors.ts          # ActionResult<T> — shared result type for all server actions
│       └── next-auth.d.ts     # Session type augmentation (role + id on user)
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
- Creating/editing sessions and recurring session series
- Managing instructor availability and blocked dates
- Recording attendance (mark present/absent/late)
- Marking lessons complete
- Creating/editing announcements
- Creating/editing student reports
- Managing users, guardian links, and co-instructors
- Profile updates and password changes
- App title configuration (superadmin only)

All 74 exported action functions live in `src/actions/` (12 files). Each returns `ActionResult<T>` (defined in `src/types/errors.ts`) — never throws for expected failures.

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

Scheduling is always on. There is no slot-computation/booking engine — instructors and admins create `ClassSession` records directly (via `src/actions/schedule.ts` and `src/actions/sessionSeries.ts`), and `src/lib/schedule.ts` provides role-aware read queries:

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

**Recurring session series:** Instructors and admins can create weekly recurring sessions (up to 12 weeks) via `src/actions/sessionSeries.ts`. Series are stored as `SessionSeries` records with linked `ClassSession` children. Individual weeks can be skipped or cancelled via `SessionSeriesException` records without affecting the rest of the series. Updating a series propagates changes to all non-cancelled sessions in the series.

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
- **Shared UI primitives** in `src/components/ui/`: `ConfirmDialog` (replaces `window.confirm` on destructive actions), `Toast` (toast notification system with React context), and `PendingButton` (`useFormStatus`-based submit button that shows a loading state during server action submission).
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

# Superadmin (env-controlled, provisioned on first login — no seed needed)
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=replace-with-a-strong-password

# Production only (Turso — see MIGRATION.md Phase 2)
# TURSO_DATABASE_URL=libsql://piwulangan-<org>.turso.io
# TURSO_AUTH_TOKEN=<token>
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

**Deferred:** Prisma query reshaping (`select`/`_count` to reduce over-fetching); splitting large client components (`ManageScheduleClient`, `AdminUsersClient`, `DashboardClient`); locale-splitting the client i18n bundle (~38 KB for both dictionaries); 320px viewport sweep for ultra-small screens.

---

## Security Checklist

- [x] All routes protected by middleware (role-based)
- [x] Passwords hashed with bcrypt (cost factor 12)
- [x] CSRF protection via Server Actions
- [x] SQL injection prevented by Prisma (parameterized queries)
- [x] XSS prevented by React (auto-escaping)
- [x] Rate limiting on auth endpoints (in-memory sliding-window, per-IP)
- [x] HTTP-only cookies for session (NextAuth JWT strategy)
- [ ] Soft-delete (no hard deletes) — not implemented; courses and users are hard-deleted
- [x] Guardian can only view linked students' data (middleware + server action guards)
- [x] Student can only view enrolled courses (enrollment checks in actions)
- [x] Instructor can only manage own courses (requireCourseManager / requireCourseOwner)
- [x] CSP headers set via middleware (Content-Security-Policy with nonce-based script loading)
- [x] Superadmin account protected by env vars (SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
- [x] Superadmin profile edits blocked (isSuperadminId guard in profile and admin actions)
- [x] Timing-safe comparison for superadmin password (crypto.timingSafeEqual)
- [ ] Secrets hardcoded in source — `Math.random()` used for invite code generation (not cryptographically secure)
