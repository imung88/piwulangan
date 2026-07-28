# Architecture — Piwulangan

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 15.1 (App Router) | Full-stack React, SSR, file-based routing, great DX |
| **Language** | TypeScript | Type safety, better DX, catches bugs early |
| **Database** | Vercel Postgres (Neon) | Serverless PostgreSQL, free tier, works with Prisma |
| **ORM** | Prisma | Type-safe queries, great migration tooling |
| **Auth** | NextAuth.js v5 (Auth.js) | Built for Next.js, handles sessions + credentials |
| **Styling** | Tailwind CSS | Utility-first, mobile-first, small bundle |
| **UI Components** | shadcn/ui | Accessible, customizable, no vendor lock-in |
| **Deployment** | Vercel | Serverless, free tier, zero ops |
| **Validation** | Zod | Runtime validation + TypeScript inference |
| **Forms** | React Hook Form + Zod | Minimal re-renders, great validation |

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
│   │   │   │       ├── assignments/   # (if module enabled)
│   │   │   │       │   └── [assignmentId]/
│   │   │   │       ├── announcements/ # Per-course announcements
│   │   │   │       ├── grades/        # (if module enabled)
│   │   │   │       ├── members/
│   │   │   │       └── manage/        # Instructor/admin
│   │   │   │           ├── content/
│   │   │   │           ├── students/
│   │   │   │           ├── announcements/
│   │   │   │           └── settings/
│   │   │   │
│   │   │   ├── schedule/              # Core: always on
│   │   │   │   ├── page.tsx           # Calendar view (role-aware, admin sees all)
│   │   │   │   ├── availability/      # Instructor: set hours
│   │   │   │   └── book/page.tsx      # Student: self-book (if enabled)
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   └── schedule/          # Admin: create/manage sessions
│   │   │   │
│   │   │   └── profile/
│   │   │
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing / redirect
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/            # Sidebar, header, nav
│   │   ├── course/            # Course-specific components
│   │   ├── schedule/          # Calendar, booking, availability
│   │   ├── dashboard/         # Role-specific dashboard cards
│   │   └── shared/            # Progress bar, resource link, etc.
│   │
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── schedule.ts        # Scheduling engine (slot computation)
│   │   ├── utils.ts           # General utilities
│   │   ├── i18n/              # Client-side locale module (cookie-based, no URL prefix)
│   │   │   ├── LocaleProvider.tsx  # React Context + cookie reader
│   │   │   ├── useT.ts            # Client t("key.path") hook
│   │   │   └── locales/
│   │   │       ├── id.ts          # Bahasa Indonesia (default)
│   │   │       └── en.ts          # English
│   │   └── validations/       # Zod schemas
│   │
│   ├── actions/               # Server Actions
│   │   ├── auth.ts            # Login, signup
│   │   ├── courses.ts         # Course CRUD
│   │   ├── lessons.ts         # Lesson CRUD
│   │   ├── schedule.ts        # Session CRUD, availability, booking
│   │   ├── progress.ts        # Mark complete
│   │   ├── assignments.ts     # Submission, grading
│   │   ├── announcements.ts   # Announcement CRUD
│   │   ├── guardians.ts       # Guardian-student linking
│   │   └── admin.ts           # Admin actions
│   │
│   └── types/                 # Shared TypeScript types
│       └── index.ts
│
├── .env.example
├── .env.local                 # (gitignored)
├── next.config.ts
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
- Booking sessions
- Marking lessons complete
- Submitting assignments, grading
- Managing users and guardian links

This eliminates API boilerplate and keeps mutations co-located with their forms.

### 3. Auth via NextAuth.js v5

```
Credentials provider (email + password)
  → bcrypt for password hashing
  → JWT session strategy
  → Middleware for route protection
  → Role stored in JWT token: admin | instructor | student | guardian
```

Role-based route protection via Next.js middleware:

```typescript
// src/middleware.ts
const roleRoutes = {
  admin: ['/admin'],
  instructor: ['/courses/*/manage', '/schedule/manage', '/schedule/availability'],
  student: ['/schedule/book'],
  guardian: ['/dashboard'], // read-only
}
```

### 4. Database: Vercel Postgres + Prisma

Vercel Postgres is Neon under the hood — serverless PostgreSQL that scales to zero.

- Free tier: 512MB storage, 1M rows
- Works with Prisma via `@prisma/adapter-neon`
- Connection pooling built in
- No connection string management needed on Vercel

### 5. No File Storage

All resources are external links. This eliminates:
- S3/blob storage configuration
- File upload validation and virus scanning
- Storage costs
- CDN configuration

Instructors paste Google Drive links. Students submit text or URLs.

### 6. Scheduling Engine (Core)

Scheduling is always on. The engine computes available slots for student self-booking.

```typescript
// src/lib/schedule.ts

interface SlotRequest {
  instructorId: string
  courseId: string
  date: Date // specific date to check
}

interface AvailableSlot {
  startTime: string  // "09:00"
  endTime: string    // "10:00"
}

async function getAvailableSlots(req: SlotRequest): Promise<AvailableSlot[]> {
  // 1. Get instructor's availability for this day of week
  const availability = await prisma.availability.findMany({
    where: {
      userId: req.instructorId,
      dayOfWeek: req.date.getDay(),
      active: true,
    }
  })

  // 2. Check if date is blocked
  const blocked = await prisma.blockedDate.findFirst({
    where: { userId: req.instructorId, date: req.date }
  })
  if (blocked) return []

  // 3. Get course config (slot duration, buffer)
  const course = await prisma.course.findUnique({
    where: { id: req.courseId },
    select: { slotDuration: true, bufferTime: true }
  })

  // 4. Get existing bookings for this date + instructor
  const bookings = await prisma.booking.findMany({
    where: {
      instructorId: req.instructorId,
      date: req.date,
      status: { not: 'CANCELLED' }
    }
  })

  // 5. Generate all possible slots, subtract booked
  return computeSlots(availability, course, bookings)
}
```

**Multi-teacher support:** Each course has one instructor. The admin can schedule sessions across different instructors. The admin calendar view queries all instructors' sessions and displays them side by side.

### 7. Module Extension System

Optional modules are toggled per course via `enabledModules[]`. Each module is self-contained:

```
Module structure:
├── actions/          # Server Actions for this module
├── components/       # UI components
├── routes/           # Page routes (added conditionally)
└── schema.prisma     # Data models (always in schema, but only used when enabled)
```

**How toggling works at the route level:**

```typescript
// In course layout, check if module is enabled
const course = await getCourse(courseId)
const hasAssignments = course.enabledModules.includes('assignments')

// Conditionally render navigation
{hasAssignments && <NavLink href={`/courses/${courseId}/assignments`}>}
```

**Adding a new module (e.g., Quizzes):**

1. Add data models to `prisma/schema.prisma`
2. Create `src/actions/quizzes.ts`
3. Create `src/components/quizzes/`
4. Create `src/app/(dashboard)/courses/[courseId]/quizzes/`
5. Add `'quizzes'` to the module enum
6. Register in course settings UI

The core app doesn't reference quiz code unless the module is enabled.

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

### Student Self-Booking Flow (if enabled)

```
Student                    Server                     Database
  │                          │                           │
  ├─ Select date ───────────►│                           │
  │                          ├─ Query availability ──────►│
  │                          │◄─ Return weekly slots ─────┤
  │                          ├─ Query bookings ──────────►│
  │                          │◄─ Return booked slots ─────┤
  │                          ├─ Compute available ────────│
  │◄─ Show available slots ──┤                           │
  │                          │                           │
  ├─ Select slot + confirm ─►│                           │
  │                          ├─ Create booking ──────────►│
  │                          │◄─ Confirmation ────────────┤
  │◄─ Booking confirmed ─────┤                           │
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
3. Add Vercel Postgres integration (free tier)
4. Set environment variables
5. Deploy

**Vercel free tier limits:**

| Resource | Limit | Impact |
|---|---|---|
| Serverless functions | 100GB-hours/month | More than enough for 200 users |
| Function execution | 10s max | Sufficient for all operations |
| Function memory | 1024MB | More than enough |
| Bandwidth | 100GB/month | Text-heavy LMS uses very little |
| Postgres storage | 512MB | ~200 users with progress data |
| Postgres rows | 1M rows | More than enough |

### Environment Variables

```env
# .env.example

# Database (auto-set by Vercel Postgres integration)
DATABASE_URL=postgresql://...
POSTGRES_URL=...

# Auth
NEXTAUTH_SECRET=generate-a-random-string-here
NEXTAUTH_URL=http://localhost:3000  # set to your Vercel URL in production
```

### Local Development

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/piwulangan.git
cd piwulangan

# Install
npm install

# Set up local Postgres (or use Neon for local dev too)
cp .env.example .env.local
# Edit .env.local with your local Postgres URL

# Migrate
npx prisma migrate dev

# Seed
npx prisma db seed

# Run
npm run dev
```

For local Postgres, use Docker (dev only):
```bash
docker run --name piwulangan-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=piwulangan -p 5432:5432 -d postgres:16-alpine
```

---

## Performance Targets

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Initial JS bundle | < 150KB (gzipped) |
| Database queries per page | < 5 |
| Lighthouse score | > 90 (Performance, Accessibility) |

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
