# PRD — Piwulangan: A Modular LMS for Small Learning Communities

> **Product Name:** Piwulangan
> **Version:** 0.1 (Draft)
> **Date:** 2026-07-25
> **License:** MIT (planned)

---

## 1. Overview

| Field | Detail |
|---|---|
| **Product Name** | Piwulangan |
| **Type** | Web-based LMS (Next.js), deployed on Vercel free tier |
| **Target Scale** | 2–200 active students per instance, 1–15 concurrent courses |
| **Primary Users** | Small training centers, tutoring shops, freelance instructors, study groups, workshop organizers |
| **Platform** | Web (mobile-first responsive) |
| **Deployment** | Vercel free tier (primary); self-hosted via Docker (future) |
| **Database** | Vercel Postgres (Neon, free tier) |
| **Non-Goals** | Enterprise compliance (SCORM/xAPI), massive concurrency, native mobile apps, built-in video hosting, file upload/storage, multi-tenant SaaS billing |

### 1.1 Problem Statement

A small training center teaches students in person, via WhatsApp, through handouts, or in workshops. The actual teaching happens everywhere — in a classroom, over a video call, through a group chat. What's missing is a **lightweight tracking layer**: where are the students in the curriculum? When is the next session? Who's falling behind?

Existing LMS platforms (Moodle, Canvas, Teachable) try to be the center of the learning experience. They're built around content delivery, quizzes, forums, and grade books. That's the wrong model for a small training center that just needs:

1. **Scheduling** — manage when sessions happen, who's teaching what, let students see their upcoming classes
2. **Progress tracking** — see which lessons a student has covered, who's keeping up, who needs attention
3. **Visibility for everyone** — admin sees the big picture, teachers see their courses, students see their progress, guardians can check in

Piwulangan is not where learning happens. It's where you **see** what's happening.

### 1.2 Vision Statement

> *"Not the classroom — the window into it. A lightweight tracker that helps teachers teach, students stay on track, and everyone see the big picture."*

### 1.3 Design Origin

Piwulangan is built as an open-source platform for anyone to use or fork. Its development is grounded in a real use case: a small training center that needs scheduling and course progress tracking. The architecture is designed to scale from a 2-student tutoring shop up to ~200 students, with optional modules that larger or more specialized instances can enable as needed.

### 1.4 Deployment Philosophy

**Primary target: Vercel free tier.** Zero cost, zero ops.

- Next.js on Vercel (serverless functions, edge middleware)
- Vercel Postgres (Neon, free tier: 512MB storage, 1M rows)
- No file uploads — resources are links to Google Drive, YouTube, etc.
- No Docker, no self-hosting in v1 — keep the stack minimal
- If a feature requires non-Vercel infrastructure (file storage, background workers, etc.), it's deferred

---

## 2. Target Users & Personas

### Persona A — **Instructor / Trainer**

| Attribute | Detail |
|---|---|
| Who | A teacher, tutor, or workshop leader |
| Tech comfort | Low to moderate — uses WhatsApp daily, maybe Google Docs |
| Goal | Teach students (in person, online, etc.), track who's keeping up, manage their schedule |
| Pain point | No central place to see "who needs what" — tracking progress in their head or in scattered notes |
| Key need | Calendar of upcoming sessions, quick progress check per student |

> The instructor teaches however they teach — in a classroom, over video, through chat. Piwulangan doesn't replace that. It helps them see the bigger picture.

### Persona B — **Student / Learner**

| Attribute | Detail |
|---|---|
| Who | A student, workshop participant, or client |
| Device | Primarily mobile phone |
| Goal | See upcoming sessions, track what's been covered, access lesson materials |
| Pain point | "When is my next class?" "What have I covered so far?" |
| Key need | Schedule view, progress dashboard, resource links |

### Persona C — **Admin / Center Owner**

| Attribute | Detail |
|---|---|
| Who | Runs the training center |
| Goal | See everything at a glance — all teachers, all students, all courses |
| Pain point | Juggling calendars, spreadsheets, and WhatsApp groups to track what's happening |
| Key need | Multi-teacher, multi-course overview; schedule management; student progress across all courses |

### Persona D — **Guardian** (View-only)

| Attribute | Detail |
|---|---|
| Who | A parent, spouse, family member, or anyone linked to a student |
| Goal | See the student's upcoming sessions and progress |
| Pain point | "How is my child/spouse/family member doing? When is the next class?" |
| Key need | Read-only access to schedule and progress for their linked student |

> Guardians don't create content or manage courses. They just need visibility.

---

## 3. Design Principles

| # | Principle | Meaning |
|---|---|---|
| 1 | **Mobile-first** | Every screen designed for a phone viewport first, then scaled up. |
| 2 | **Modular** | Features are opt-in. A simple study group shouldn't see scheduling if they don't need it. Each module can be enabled/disabled per course. |
| 3 | **Tracking, not teaching** | Piwulangan doesn't replace the classroom. It helps everyone see what's happening across courses, teachers, and students. |
| 4 | **Multi-teacher, multi-course** | An instance supports multiple instructors, each with multiple courses. Students can be enrolled in courses from different teachers. |
| 5 | **Opinionated simplicity** | Strong defaults over 15 configuration options. One good layout beats ten customizable ones. |
| 6 | **Zero-config onboarding** | An instructor should create a course and share a link within 5 minutes of signing up. |
| 7 | **Zero-cost deploy** | Must run on Vercel free tier + free database. No paid infrastructure required. |

---

## 4. Feature Modules

Features are grouped into **modules** that can be toggled on/off per course. This modularity is a core design principle — not a nice-to-have.

### 4.1 Module Map

```
┌───────────────────────────────────────────────────────────┐
│                          CORE                              │
│  (always on, not toggleable)                               │
│                                                            │
│  ● Auth & Roles                                            │
│  ● Course Shell                                            │
│  ● Content Delivery (Lessons & Resources)                  │
│  ● Progress Tracking                                       │
│  ● Scheduling & Calendar    ← always on, admin-managed     │
│  ● Dashboards (role-aware)                                 │
└───────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ASSIGNMENTS  │ │ ANNOUNCE-    │ │ CERTIFICATES │ │  GRADEBOOK   │
│   MODULE     │ │ MENTS        │ │   MODULE     │ │   MODULE     │
│  (toggle)    │ │  (toggle)    │ │  (toggle)    │ │  (toggle)    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**How toggling works:**

- Admin/Instructor enables optional modules per course in course settings
- Disabled modules are completely hidden — no menu items, no empty pages, no confusion
- Core is always on — you can't run a course without lessons, progress, and scheduling
- A study group might enable only Core (lessons + progress + schedule)
- A training center might enable Core + Announcements + Assignments
- A formal school might enable Core + Assignments + Gradebook + Certificates

**Extension system:**

The module architecture is designed to be extended. Each module is a self-contained feature with its own data models, routes, and UI. Third-party modules (quizzes, discussions, live sessions, etc.) can be added by forking the repo and implementing the module interface. See `ARCHITECTURE.md` for the module contract.

---

### 4.2 Core Module (Always On)

#### 4.2.1 Authentication & Roles

| Requirement | Detail |
|---|---|
| Login methods | Email + password |
| OAuth (optional) | Google sign-in (Phase 4) |
| Roles | `admin`, `instructor`, `student`, `guardian` |
| Role assignment | Admin assigns globally; Instructor auto-assigned when creating a course; Student gets role on enrollment; Guardian linked to student(s) by admin |
| Multi-role | A user can be instructor of Course A and student in Course B; a guardian can be linked to multiple students |

**Role Permissions Matrix:**

| Action | Admin | Instructor | Student | Guardian |
|---|---|---|---|---|
| Create course | ✅ | ✅ (own) | ❌ | ❌ |
| Edit course settings | ✅ | ✅ (own) | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Add/edit lessons | ✅ | ✅ (own) | ❌ | ❌ |
| View lessons | ✅ | ✅ (own) | ✅ (enrolled) | ✅ (linked child) |
| View student progress | ✅ | ✅ (own course) | Own only | ✅ (linked child) |
| Manage schedule | ✅ | ✅ (own) | ❌ | ❌ |
| View schedule | ✅ | ✅ (own) | ✅ (enrolled) | ✅ (linked child) |
| Book sessions | ❌ | ❌ | ✅ (if enabled) | ❌ |
| Post announcements | ✅ | ✅ (own) | ❌ | ❌ |

#### 4.2.2 Course Shell

| Field | Type | Notes |
|---|---|---|
| Title | Text | Required, max 120 chars |
| Description | Rich text | Markdown, max 2000 chars |
| Cover image | URL | Optional link to an external image |
| Visibility | Draft / Published | Draft = only visible to instructor/admin |
| Enrollment mode | Open / Invite-code / Manual | Open = anyone with link; Invite-code = enter code; Manual = admin adds students |
| Invite code | Auto-generated 6-char | Displayed to instructor for sharing |
| Enabled modules | Module toggles | Which optional modules are active for this course |

**Course Structure:**

```
Course
 └── Module (ordered)
      └── Lesson (ordered)
           ├── Title
           ├── Content body (Markdown)
           ├── Resource links (Google Drive, external URLs)
           └── Enabled modules: [assignments? announcements? gradebook?]
```

#### 4.2.3 Content Delivery (Lessons)

The lesson page is the **most important screen** in the product.

**Lesson Page Layout (Mobile):**

```
┌──────────────────────────┐
│  ← Back    Module 2 / 3  │
│──────────────────────────│
│  Lesson Title            │
│  ~15 min read            │
│──────────────────────────│
│                          │
│  [Content Body]          │
│  Markdown rendered       │
│  Images, lists, links    │
│                          │
│  📎 [Handout (Google Drive)]│
│  📎 [Worksheet (Google Drive)]│
│                          │
│  ┌────────────────────┐  │
│  │ ▶ Embedded Video   │  │
│  │   (YouTube/Vimeo)  │  │
│  └────────────────────┘  │
│                          │
│──────────────────────────│
│  ✓ Mark as Complete      │
│──────────────────────────│
│  ← Prev  |  Next →       │
└──────────────────────────┘
```

**Supported content types:**

| Type | Implementation |
|---|---|
| Text | Markdown rendered server-side |
| Images | External URLs or inline Markdown images (no upload) |
| Video | Embed only (YouTube, Vimeo, Bilibili). No self-hosted video. |
| Resources | Links to Google Drive, Dropbox, or any external URL (PDF, DOCX, etc.) |
| Code blocks | Syntax-highlighted (Shiki/Prism) |
| Math | KaTeX rendering |
| External embeds | iframe whitelist (Google Slides, Figma, etc.) |

> **No file uploads.** All resources (PDFs, handouts, worksheets) are shared as links. This keeps the app lightweight and avoids storage costs. Instructors upload files to Google Drive (or similar) and paste the link into the lesson.

#### 4.2.4 Progress Tracking

| Aspect | Detail |
|---|---|
| Trigger | Student clicks "Mark as Complete" button on each lesson |
| Storage | `Progress` table: `(userId, lessonId, completedAt)` |
| Display (student) | Progress bar on course page, checkmarks on sidebar TOC |
| Display (instructor) | Table: each student × each module, with completion % |
| Calculation | Course % = (completed lessons / total lessons) × 100 |

#### 4.2.5 Dashboards

**Student Dashboard:**

```
┌──────────────────────────────┐
│  Welcome back, Alice 👋      │
│──────────────────────────────│
│  📅 Upcoming Sessions        │
│  Mon 09:00  English — Teacher A│
│  Wed 09:00  Piano — Teacher B │
│  Thu 09:00  English — Teacher A│
│                              │
│  📚 My Courses               │
│  ┌────────────────────────┐  │
│  │ English Basics   67%   │  │
│  │ Teacher A             │  │
│  │ ████████░░░░░░░        │  │
│  │ Next: Lesson 8         │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Piano 101        30%   │  │
│  │ Teacher B             │  │
│  │ ████░░░░░░░░░░░        │  │
│  └────────────────────────┘  │
│                              │
│  📢 Announcements (if enabled)
│  • No class on Monday        │
└──────────────────────────────┘
```

**Guardian Dashboard:**

```
┌──────────────────────────────┐
│  Alice's Progress 👨‍👩‍👧        │
│──────────────────────────────│
│  📅 Upcoming Sessions        │
│  Mon 09:00  English — Teacher A│
│  Wed 09:00  Piano — Teacher B │
│                              │
│  📚 Progress                 │
│  English Basics: 67%         │
│  Piano 101: 30%              │
│                              │
│  📢 Recent Announcements     │
│  • No class on Monday        │
│                              │
│  (View only — no editing)    │
└──────────────────────────────┘
```

**Instructor Dashboard:**

```
┌──────────────────────────────┐
│  Good morning, Teacher A ☀️   │
│──────────────────────────────│
│  📅 Today's Sessions         │
│  09:00  English — Alice, Bob │
│  10:15  English — Carol      │
│  14:00  Piano — Bob          │
│                              │
│  📊 Quick Stats              │
│  • 3 new submissions today (if assignments)
│  • 12 sessions this week     │
│  • 3 students at 80%+ progress│
│                              │
│  📚 My Courses               │
│  [English Basics (12 students)]│
│  [Piano 101 (5 students)]    │
└──────────────────────────────┘
```

**Admin Dashboard:**

```
┌──────────────────────────────┐
│  Admin Panel                 │
│──────────────────────────────│
│  👥 24 users · 2 instructors │
│     20 students · 2 guardians │
│  📚 5 courses                │
│  📅 8 sessions today         │
│                              │
│  Today's Sessions (all teachers)
│  09:00  Teacher A  English   │
│          Alice, Bob          │
│  09:00  Teacher B  Piano     │
│          Carol               │
│  10:15  Teacher A  English   │
│          Dan                 │
│                              │
│  Recent Activity             │
│  • Alice completed Lesson 5  │
│  • Bob booked Thu 2:00 PM    │
│  • Carol cancelled tomorrow  │
│                              │
│  [Manage Users] [Manage Courses]
│  [View Schedule] [Settings]  │
└──────────────────────────────┘
```

---

### 4.3 Core — Scheduling & Calendar

Scheduling is always on. Every course has a schedule. Every user sees their relevant calendar view.

**Default behavior: admin-managed.** The admin (or instructor) creates and manages all sessions. Students and guardians see the schedule but cannot book or modify it.

**Optional: student self-booking.** The admin can enable a per-course setting that allows students to book available time slots themselves, based on instructor availability.

#### 4.3.1 Schedule Management (Admin / Instructor)

The admin or instructor manages the schedule for their courses:

| Action | Who | Description |
|---|---|---|
| Create session | Admin, Instructor | Add a session to the calendar with date, time, course, instructor |
| Edit session | Admin, Instructor | Change date, time, or reassign instructor |
| Cancel session | Admin, Instructor | Cancel with optional reason |
| Mark attendance | Admin, Instructor | Record Present / Late / Absent + per-attendee notes on the session's detail page (on or after the session date) |
| Set availability | Instructor | Define weekly available hours (used for student booking if enabled) |
| Block dates | Instructor | Block holidays, sick days, etc. |
| Enable student booking | Admin | Toggle per course: students can self-book from available slots |

Each session has an individual detail page (`/courses/[id]/schedule/[sessionId]`), reached
by clicking a session in the list or week calendar. Managers do per-session work there —
edit details, assign students, record attendance, cancel — while students and guardians see
a read-only view of their own attendance. Edits respect locks: attendance is editable on the
session date and past sessions; details and roster on today and future dates; cancelled
sessions are read-only.

**Admin schedule view (all instructors, all courses):**

```
┌──────────────────────────────────────────────────┐
│  Schedule Overview        ◀ Jul 21 - Jul 27 ▶    │
│──────────────────────────────────────────────────│
│          Mon 21    Tue 22    Wed 23    Thu 24     │
│  09:00   Teacher A  —        Teacher B  Teacher A │
│          English             Piano      English   │
│          Alice,Bob           Carol      Alice     │
│                                                    │
│  10:15   Teacher A  Teacher B  —        —         │
│          English    Piano                          │
│          Carol      Bob                            │
│                                                    │
│  14:00   Teacher B  Teacher A  —        Teacher B  │
│          Piano      English              Piano     │
│          Alice      Carol,Dan            Alice,Bob │
│──────────────────────────────────────────────────│
│  Today: 6 sessions · 2 instructors · 4 students   │
└──────────────────────────────────────────────────┘
```

**Instructor schedule view (own sessions only):**

```
┌──────────────────────────────┐
│  My Schedule                 │
│  ◀ Jul 21 - Jul 27 ▶        │
│──────────────────────────────│
│  Mon 21                      │
│  09:00  English — Alice, Bob │
│  10:15  English — Carol      │
│  14:00  (no session)         │
│                              │
│  Tue 22                      │
│  10:15  Piano — Bob          │
│──────────────────────────────│
│  This week: 8 sessions       │
│  Today: 3 sessions           │
└──────────────────────────────┘
```

**Student schedule view (own sessions only):**

```
┌──────────────────────────────┐
│  My Schedule                 │
│  ◀ Jul 21 - Jul 27 ▶        │
│──────────────────────────────│
│  Mon 21                      │
│  09:00  English — Teacher A  │
│                              │
│  Wed 23                      │
│  09:00  Piano — Teacher B    │
│                              │
│  Thu 24                      │
│  09:00  English — Teacher A  │
│──────────────────────────────│
│  This week: 3 sessions       │
│  Next: Mon 09:00 English     │
└──────────────────────────────┘
```

#### 4.3.2 Instructor Availability

Instructors define their weekly available hours. This is used for:
- Admin reference when scheduling sessions
- Student self-booking (if enabled)

| Field | Detail |
|---|---|
| Weekly recurring slots | Instructor sets available hours per day of week |
| Exception dates | Block out holidays, sick days, etc. |
| Slot duration | Configurable per course (30min, 45min, 60min, 90min) |
| Buffer time | Optional gap between sessions (e.g., 15min) |

#### 4.3.3 Student Self-Booking (Optional)

When the admin enables student booking for a course:

```
Student opens course → "Book a Session"
  → Sees calendar with available slots (green = open, gray = taken)
  → Picks a date → picks a time slot
  → Confirms booking
  → Slot shows as "Booked" on instructor and student calendars
```

**Student booking view:**

```
┌──────────────────────────────┐
│  Book a Session              │
│  Course: English Basics      │
│  Instructor: Teacher A       │
│──────────────────────────────│
│  ◀ Jul 2026 ▶               │
│  ┌───┬───┬───┬───┬───┬───┐  │
│  │Mon│Tue│Wed│Thu│Fri│Sat│  │
│  │   │   │ 1 │ 2 │ 3 │ 4 │  │
│  │ 5 │ 6 │ 7 │ 8 │ 9 │10 │  │
│  │11 │12 │13 │14 │15 │16 │  │
│  │17 │18 │19 │20 │21 │22 │  │
│  │23 │24 │25 │26 │27 │28 │  │
│  │29 │30 │31 │   │   │   │  │
│  └───┴───┴───┴───┴───┴───┘  │
│                              │
│  Select a date: July 21      │
│                              │
│  Available Slots:            │
│  ● 09:00 - 10:00             │
│  ● 10:15 - 11:15             │
│  ○ 11:30 - 12:30 (taken)     │
│  ● 14:00 - 15:00             │
│                              │
│        [Book This Slot]      │
└──────────────────────────────┘
```

#### 4.3.4 Booking Rules

| Rule | Detail |
|---|---|
| Max advance booking | 30 days ahead (configurable per course) |
| Cancellation | Student can cancel up to 24h before (configurable) |
| No-show tracking | Instructor marks attendance (present / no-show) |
| Recurring sessions | Not in v1 — each session created individually |
| Double booking | Prevented by system |
| Multi-instructor | Each course has one instructor; admin can schedule across all instructors |
| Multi-student per slot | Default: group (multiple students can book same slot). Configurable to 1-on-1 per course. |

---

### 4.4 Optional Module — Assignments

| Requirement | Detail |
|---|---|
| Creation | Instructor creates assignment within a lesson or standalone in a module |
| Fields | Title, description (rich text), due date (optional) |
| Submission | Student writes text response and/or pastes a link (e.g., Google Drive file) |
| Status | Not submitted / Submitted / Reviewed / Needs revision |
| Feedback | Instructor writes text feedback per submission |
| Grade | Numeric (0–100) or letter (A–F) — instructor chooses per course |
| Late submission | Allowed with visual "Late" badge; no auto-penalty in v1 |
| Notifications | Student notified when graded; instructor notified on new submission |

> **No file uploads.** Students submit work as text or links to external files (Google Docs, GitHub repos, etc.). This avoids storage costs and keeps the platform lightweight.

---



---

### 4.5 Optional Module — Announcements

| Requirement | Detail |
|---|---|
| Scope | Per-course broadcast |
| Author | Instructor or Admin |
| Format | Title + rich text body |
| Visibility | Shows on course dashboard, student home dashboard |
| Pinning | Latest announcement pinned to top of course page |

---

### 4.6 Optional Module — Certificates

| Requirement | Detail |
|---|---|
| Trigger | Auto-generated when student completes 100% of course |
| Format | Simple printable page (HTML/CSS) with student name, course title, date, instructor name |
| Download | Student can print from browser (Ctrl+P / Cmd+P) |

> No PDF generation (requires heavy dependencies). A clean printable HTML page works on any device.

---

### 4.7 Optional Module — Gradebook

| Requirement | Detail |
|---|---|
| Scope | Aggregate view of all grades across assignments |
| Student view | Own grades only, per course |
| Instructor view | All students × all graded items, with averages |
| Export | CSV download for instructor |

---

### 4.8 Extension Points (Out of Scope for v1)

The module system is designed for extensibility. These modules are not built in v1 but the architecture supports adding them:

| Module | Summary |
|---|---|
| **Quizzes** | Question types, auto-grading, attempts — data model hooks exist |
| **Discussion** | Per-lesson threads, replies, moderation — data model hooks exist |
| **Live Sessions** | Embed Zoom/Google Meet links per lesson with scheduled time |
| **Payments** | Stripe integration for paid courses |
| **Analytics** | Engagement heatmaps, time-on-page, drop-off points |
| **Multi-language** | i18n with locale switching |
| **Recurring Bookings** | Book same time slot weekly |

> Fork the repo and implement the module interface to add any of these. See `ARCHITECTURE.md` for the contract.

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | First Contentful Paint < 1.5s on 3G; lesson page < 200KB initial load |
| **Mobile** | All features functional on viewport ≥ 320px; touch targets ≥ 44px |
| **Browser support** | Last 2 versions of Chrome, Safari, Firefox, Edge |
| **Availability** | Vercel uptime (~99.9%) |
| **Security** | Auth via HTTP-only cookies; CSRF protection; role-based route guards |
| **Data** | Soft-delete for courses and users |
| **Accessibility** | WCAG 2.1 AA: proper headings, alt text prompts, keyboard navigation, color contrast ≥ 4.5:1 |
| **Deployment** | Vercel free tier (serverless) |
| **Database** | Vercel Postgres (Neon free tier: 512MB storage) |
| **Storage** | None — all resources are external links |
| **Scalability ceiling** | Designed for ≤ 200 concurrent users, ≤ 15 active courses |
| **Bandwidth** | Vercel free tier: 100GB/month (sufficient for text-heavy LMS) |
| **Function limits** | Vercel free tier: 10s execution, 1024MB memory per function |

---

## 6. Information Architecture

```
/ (redirect based on role)
│
├── /login
├── /signup
│
├── /dashboard                  # Role-aware home (admin/instructor/student/guardian)
│
├── /announcements              # Global announcements (all courses)
│
├── /schedule                   # Core: always on (admin sees all instructors)
│   ├── /schedule/availability  # Instructor: set available hours
│   └── /schedule/book          # Student: self-book (if enabled for course)
│
├── /courses
│   ├── /courses/new            # Create course (instructor/admin)
│   ├── /courses/[courseId]
│   │   ├── /overview           # Course landing page
│   │   ├── /lessons/[lessonId] # Lesson viewer
│   │   ├── /assignments        # (if assignments enabled)
│   │   │   └── /[assignmentId]
│   │   ├── /announcements      # Per-course announcements (owners manage inline)
│   │   ├── /grades             # (if gradebook enabled)
│   │   └── /members            # Course roster
│   │
│   └── /courses/[courseId]/manage
│       ├── /manage/content     # Content editor
│       ├── /manage/students    # Roster + progress
│       ├── /manage/settings    # Course settings + module toggles
│       └── /manage/grades      # (if gradebook enabled)
│
├── /admin
│   └── /admin/schedule         # Admin: create/manage sessions (advanced)
│
└── /profile
```

---

## 7. Data Model

```prisma
// ─── Auth ───

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String?
  role          Role      @default(STUDENT)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  enrollments   Enrollment[]
  progress      Progress[]
  submissions   Submission[]
  announcements Announcement[]    @relation("Author")
  coursesCreated Course[]         @relation("Instructor")
  bookings      Booking[]        @relation("Student")
  availability  Availability[]
  attendances   Attendance[]     @relation("Instructor")
  guardianLinks GuardianStudent[] @relation("Guardian")
  studentLinks  GuardianStudent[] @relation("Student")
}

enum Role {
  ADMIN
  INSTRUCTOR
  STUDENT
  GUARDIAN
}

// Links a guardian to one or more students
model GuardianStudent {
  id         String  @id @default(cuid())
  guardianId String
  guardian   User    @relation("Guardian", fields: [guardianId], references: [id], onDelete: Cascade)
  studentId  String
  student    User    @relation("Student", fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([guardianId, studentId])
}

// ─── Course Structure ───

model Course {
  id              String    @id @default(cuid())
  title           String
  description     String?   @db.Text
  coverImageUrl   String?              // external URL (no file upload)
  visibility      Visibility @default(DRAFT)
  enrollmentMode  EnrollmentMode @default(OPEN)
  inviteCode      String?   @unique
  enabledModules  String[]  @default([])  // ["assignments","announcements","certificates","gradebook"]

  // Scheduling config
  studentBookingEnabled Boolean @default(false)  // allow students to self-book
  slotDuration       Int    @default(60)   // minutes
  bufferTime         Int    @default(15)   // minutes between slots
  maxAdvanceDays     Int    @default(30)   // how far ahead students can book
  cancellationHours  Int    @default(24)   // hours before session to allow cancellation

  instructorId    String
  instructor      User      @relation("Instructor", fields: [instructorId], references: [id])

  modules         Module[]
  enrollments     Enrollment[]
  announcements   Announcement[]
  bookings        Booking[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Visibility {
  DRAFT
  PUBLISHED
}

enum EnrollmentMode {
  OPEN
  INVITE_CODE
  MANUAL
}

model Module {
  id        String   @id @default(cuid())
  title     String
  order     Int
  courseId   String
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons   Lesson[]
}

model Lesson {
  id          String    @id @default(cuid())
  title       String
  content     String?   @db.LongText   // Markdown
  type        LessonType @default(TEXT)
  order       Int
  duration    Int?                     // estimated minutes
  moduleId    String
  module      Module    @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  resources   Resource[]             // links to external files
  progress    Progress[]
  assignment  Assignment?
}

enum LessonType {
  TEXT
  VIDEO
  FILE
  MIXED
}

model Resource {
  id        String  @id @default(cuid())
  title     String              // display name, e.g. "Handout PDF"
  url       String              // Google Drive, Dropbox, or any external URL
  type      ResourceType @default(LINK)
  lessonId  String
  lesson    Lesson  @relation(fields: [lessonId], references: [id], onDelete: Cascade)
}

enum ResourceType {
  LINK
  VIDEO
  DOCUMENT
}

// ─── Enrollment ───

model Enrollment {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  enrolledAt DateTime @default(now())

  @@unique([userId, courseId])
}

// ─── Progress ───

model Progress {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId    String
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  completed   Boolean  @default(false)
  completedAt DateTime?

  @@unique([userId, lessonId])
}

// ─── Scheduling Module ───

model Availability {
  id          String   @id @default(cuid())
  userId      String   // instructor
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dayOfWeek   Int      // 0=Sunday, 1=Monday, ... 6=Saturday
  startTime   String   // "09:00" (HH:MM)
  endTime     String   // "12:00"
  courseId     String?  // null = applies to all courses
  active      Boolean  @default(true)

  @@unique([userId, dayOfWeek, startTime, courseId])
}

model BlockedDate {
  id          String   @id @default(cuid())
  userId      String   // instructor
  date        DateTime @db.Date
  reason      String?
  createdAt   DateTime @default(now())
}

model Booking {
  id            String   @id @default(cuid())
  courseId       String
  course         Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  studentId      String
  student        User     @relation("Student", fields: [studentId], references: [id])
  instructorId   String
  date           DateTime @db.Date
  startTime      String   // "10:00"
  endTime        String   // "11:00"
  status         BookingStatus @default(CONFIRMED)
  cancelledAt    DateTime?
  cancelReason   String?
  createdAt      DateTime @default(now())

  attendance     Attendance?
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

model Attendance {
  id          String   @id @default(cuid())
  bookingId   String   @unique
  booking     Booking  @relation(fields: [bookingId], references: [id])
  instructorId String
  instructor   User     @relation("Instructor", fields: [instructorId], references: [id])
  present      Boolean
  notes        String?
  recordedAt   DateTime @default(now())
}

// ─── Assignments Module ───

model Assignment {
  id              String    @id @default(cuid())
  lessonId        String    @unique
  lesson          Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  title           String
  description     String?   @db.Text
  dueDate         DateTime?

  submissions     Submission[]
}

model Submission {
  id            String   @id @default(cuid())
  assignmentId  String
  assignment    Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  textContent   String?  @db.Text
  linkUrl       String?              // link to external file (Google Drive, etc.)
  status        SubmissionStatus @default(SUBMITTED)
  grade         Float?
  feedback      String?  @db.Text
  submittedAt   DateTime @default(now())
  reviewedAt    DateTime?
  isLate        Boolean  @default(false)

  @@unique([assignmentId, userId])
}

enum SubmissionStatus {
  SUBMITTED
  REVIEWED
  NEEDS_REVISION
}

// ─── Announcements Module ───

model Announcement {
  id        String   @id @default(cuid())
  courseId   String
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  authorId  String
  title     String
  body      String   @db.Text
  pinned    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## 8. Key User Flows

### 8.1 Admin: Set Up Multi-Teacher Schedule

```
Admin logs in → Dashboard
  → Sees 2 instructors, 5 courses
  → Goes to Schedule → Manage
  → Creates session: Mon 09:00, English, Teacher A, students: Alice & Bob
  → Creates session: Mon 09:00, Piano, Teacher B, student: Carol
  → Creates session: Mon 10:15, English, Teacher A, student: Dan
  → Weekly view shows all instructors side by side
  → Students see their own sessions on their dashboards
```

### 8.2 Student: See Schedule + Track Progress

```
Student logs in → Dashboard
  → Sees upcoming sessions: Mon English, Wed Piano, Thu English
  → Clicks "English Basics" → opens course
  → Opens Lesson 3 → reads content + clicks resource link
  → Clicks "Mark as Complete" ✓
  → Progress updates: 3/8 lessons (37.5%)
  → Navigates to next lesson
```

### 8.3 Student: Book a Session (if enabled)

```
Student opens course → "Book a Session"
  → Sees Teacher A's available slots
  → Picks date + time → confirms
  → Booking appears on dashboard and instructor calendar
```

### 8.4 Guardian: Check Student's Progress

```
Guardian logs in → Dashboard
  → Sees linked student's upcoming sessions
  → Sees progress: English 67%, Piano 30%
  → Sees announcements from teachers
  → Read-only — no actions needed
```

### 8.5 Instructor: Review Submissions (Assignments module)

```
Instructor opens course → Manage → Students
  → Sees submission count badge: "3 new"
  → Opens Assignment → sees list of submissions
  → Clicks student submission → reads text / opens linked file
  → Types feedback, enters grade
  → Student gets notification
```

---

## 9. Phased Roadmap

### Phase 1 — MVP (Weeks 1–6)

| Deliverable | Notes |
|---|---|
| Auth (email + password) | Login, signup, 4 roles (admin, instructor, student, guardian) |
| Course CRUD | Create, edit, publish courses |
| Module + Lesson structure | Ordered modules with ordered lessons |
| Lesson viewer | Markdown content, resource links, video embeds |
| Enrollment | Invite code + open enrollment |
| Progress tracking | Mark complete, progress bars |
| **Scheduling (core)** | Admin/Instructor creates sessions, multi-teacher calendar, student/guardian view |
| **Instructor availability** | Weekly hours, blocked dates |
| Basic dashboards | Role-aware: admin, instructor, student, guardian |
| **Module toggle system** | Enable/disable optional modules per course |
| Mobile-responsive layout | Tailwind CSS, mobile-first |
| **Vercel deployment** | Deploy to Vercel free tier + Vercel Postgres |

### Phase 2 — Engagement (Weeks 7–10)

| Deliverable | Notes |
|---|---|
| **Student self-booking** | Optional per course: students book from instructor availability |
| Assignments module | Text/link submissions, grading, feedback |
| Announcements module | Course-wide broadcasts |
| Instructor progress view | Per-student completion table |
| Attendance tracking | Present / no-show per session |
| Guardian dashboard | View-only: linked student's schedule + progress |

### Phase 3 — Assessment (Weeks 11–14)

| Deliverable | Notes |
|---|---|
| Gradebook module | Aggregate grades per student |
| Certificates module | Printable HTML completion certificate |
| Notifications | In-app notification center |
| Admin schedule overview | All instructors, all courses, side by side |

### Phase 4 — Polish (Weeks 15–18)

| Deliverable | Notes |
|---|---|
| Admin panel | User management, guardian-student linking, course oversight |
| Google OAuth | Social login |
| Recurring sessions | Create weekly recurring sessions |
| Email notifications | Booking confirmations, grading alerts (via Resend free tier) |

### Future (Post-v1)

| Deliverable | Notes |
|---|---|
| PWA support | Installable, offline lesson caching |
| Self-hosted / Docker | Docker Compose for VPS deployment |
| Cloudflare adapter | Edge deployment option |
| Multi-language | i18n with locale switching |
| **Extension modules** | Quizzes, discussions, live sessions — community-built |

---

## 10. Out of Scope (Explicit Non-Goals)

| Item | Why |
|---|---|
| File uploads / storage | All resources are external links. No S3, no local storage. |
| Native mobile apps | PWA is sufficient for this scale |
| Self-hosted video | Use YouTube/Vimeo embeds; hosting video is a cost/complexity trap |
| SCORM / xAPI compliance | Enterprise standards; irrelevant for small groups |
| AI features (auto-grading essays, chatbots) | Unnecessary complexity; focus on core value |
| Multi-tenant SaaS billing | Each instance is self-hosted; no per-tenant billing needed |
| Real-time collaboration | Overkill; async is sufficient |
| Complex permissions (custom roles) | Four roles (admin/instructor/student/guardian) cover the use case |
| Course marketplace / discovery | Courses are shared via direct link or code, not browsed publicly |
| PDF generation | Heavy dependencies; printable HTML certificates instead |
| Docker / self-hosting (v1) | Deferred — Vercel free tier is the primary target |
| Quizzes (built-in) | Deferred — extension module; architecture supports adding it later |
| Discussions (built-in) | Deferred — extension module; architecture supports adding it later |

---

## 11. Success Metrics

| Metric | Target | How to Measure |
|---|---|---|
| Time to first course published | < 5 minutes | Track signup → publish timestamp |
| Student lesson completion rate | > 70% | Completed lessons / enrolled lessons |
| Mobile usage satisfaction | No feature complaints | User testing feedback |
| Instructor content creation time | < 10 min per lesson | Observational testing |
| Page load on mobile (3G) | < 2 seconds | Lighthouse audit |
| Module adoption | At least 1 optional module enabled per course | Database query |
| Multi-teacher usage | Admin schedules across multiple instructors | Database query |
| Guardian engagement | Guardians check progress at least once a week | Page view tracking |
| Deployment time | < 5 minutes from fork to live | Time a new deploy from GitHub to Vercel |
| Monthly cost | $0 | Vercel free tier + Vercel Postgres free tier |
