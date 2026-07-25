# Development Plan — Piwulangan

> Detailed build plan for developing Piwulangan from zero to v1.
> Each phase lists tasks in dependency order. Tasks within a phase can sometimes overlap.

---

## Phase 0 — Foundation (Days 1–3)

Set up the project skeleton. Nothing visible to users yet — just plumbing.

### 0.1 Project Bootstrap

- [ ] `npx create-next-app@latest` with TypeScript, Tailwind, App Router, src directory
- [ ] Configure `tailwind.config.ts` (Slate palette, mobile-first breakpoints)
- [ ] Set up ESLint + Prettier
- [ ] Initialize Git, create GitHub repo (`https://github.com/imung88/piwulangan`)
- [ ] Use `main` branch, direct commits (no feature branches for now)
- [ ] Package manager: npm
- [ ] Add `.env.example`, `.gitignore`
- [ ] Install shadcn/ui, add base components (Button, Input, Card, Dialog, Sheet)

### 0.2 Database Setup

- [ ] Set up Vercel Postgres (or local Neon for dev)
- [ ] Install Prisma (`@prisma/adapter-neon`, `@neondatabase/serverless`)
- [ ] Create initial `prisma/schema.prisma` with core models only (User, Course, Module, Lesson, Resource, Enrollment, Progress)
- [ ] Run first migration
- [ ] Create `src/lib/db.ts` (Prisma client singleton)
- [ ] Write seed script with test data (1 admin, 1 instructor, 2 students, 1 guardian, 1 course with 3 modules)

### 0.3 Auth

- [ ] Install NextAuth.js v5 (`@auth/core`, `next-auth`)
- [ ] Configure Credentials provider (email + password)
- [ ] Set up bcrypt password hashing
- [ ] Create JWT session with role
- [ ] Create middleware for route protection
- [ ] Build login page (`/login`)
- [ ] Build signup page (`/signup`)
- [ ] Test: login as each role, verify redirect behavior

**Phase 0 deliverable:** A running Next.js app with auth, database, and seed data. Can log in and see a blank dashboard.

---

## Phase 1 — Core: Courses & Lessons (Days 4–10)

The heart of the app — creating courses, adding lessons, viewing content, tracking progress.

### 1.1 Course CRUD

- [ ] Server Actions: `createCourse`, `updateCourse`, `deleteCourse`, `getCourse`, `getCourses`
- [ ] Course list page (`/courses`) — shows enrolled courses for students, all courses for admin
- [ ] Create course page (`/courses/new`) — title, description, enrollment mode, cover image URL
- [ ] Course settings page (`/courses/[id]/manage/settings`) — edit details, toggle modules, manage invite code
- [ ] Course overview page (`/courses/[id]`) — landing page with module list and progress

### 1.2 Module & Lesson CRUD

- [ ] Server Actions: `createModule`, `reorderModules`, `createLesson`, `updateLesson`, `deleteLesson`, `reorderLessons`
- [ ] Content editor (`/courses/[id]/manage/content`) — drag-to-reorder modules and lessons, Markdown editor for lesson content
- [ ] Resource links — add/edit/remove external links (title + URL) per lesson
- [ ] Video embed support (YouTube, Vimeo — parse URL → iframe)

### 1.3 Lesson Viewer

- [ ] Lesson page (`/courses/[id]/lessons/[lessonId]`) — render Markdown content, show resource links, show video embeds
- [ ] Previous/Next navigation
- [ ] Estimated read time (based on word count)
- [ ] Mobile layout: back button, content, mark complete, navigation

### 1.4 Progress Tracking

- [ ] Server Action: `toggleProgress` (mark lesson complete/incomplete)
- [ ] "Mark as Complete" button on lesson page
- [ ] Progress bar on course overview (X/Y lessons, %)
- [ ] Checkmarks on lesson sidebar/TOC
- [ ] Instructor view: per-student completion table (`/courses/[id]/manage/students`)

### 1.5 Enrollment

- [ ] Server Actions: `enrollByCode`, `enrollByLink`, `enrollManual`, `removeEnrollment`
- [ ] Invite code flow: student enters code on `/courses` → enrolled
- [ ] Open enrollment: student clicks "Join" on course overview
- [ ] Manual enrollment: admin/instructor adds students by email
- [ ] Enrollment list on course members page

**Phase 1 deliverable:** Full course lifecycle — instructor creates course, adds lessons with content and resource links, students enroll, view lessons, mark progress. Instructor sees student progress table.

---

## Phase 2 — Scheduling (Days 11–18)

The other core feature — session management, calendars, availability.

### 2.1 Data Models

- [ ] Add to schema: `Availability`, `BlockedDate`, `Booking`, `Attendance`
- [ ] Add scheduling config to Course: `studentBookingEnabled`, `slotDuration`, `bufferTime`, `maxAdvanceDays`, `cancellationHours`
- [ ] Run migration

### 2.2 Instructor Availability

- [ ] Server Actions: `setAvailability`, `getAvailability`, `addBlockedDate`, `removeBlockedDate`
- [ ] Availability page (`/schedule/availability`) — weekly recurring hours editor
- [ ] Blocked dates management — add/remove holiday/off-day dates
- [ ] Per-course availability (optional: instructor has different hours for different courses)

### 2.3 Admin Session Management

- [ ] Server Actions: `createSession`, `updateSession`, `cancelSession`, `getSessions`
- [ ] Admin schedule page (`/admin/schedule`) — weekly view across all instructors
- [ ] Create session form: pick date, time, course, instructor, students
- [ ] Edit/cancel existing sessions
- [ ] Instructor schedule view (`/schedule`) — own sessions only
- [ ] Student schedule view (`/schedule`) — own sessions only
- [ ] Guardian schedule view — linked student's sessions (read-only)

### 2.4 Scheduling Engine

- [ ] `src/lib/schedule.ts` — `getAvailableSlots(instructorId, courseId, date)`
- [ ] Algorithm: availability → subtract blocked → generate slots → subtract booked
- [ ] Support multi-student slots (group sessions) vs single-student slots

### 2.5 Student Self-Booking (Optional)

- [ ] Toggle `studentBookingEnabled` in course settings
- [ ] Booking page (`/schedule/book`) — calendar + slot picker
- [ ] Server Action: `bookSlot` — validates availability, creates booking
- [ ] Cancellation flow — student cancels with notice period
- [ ] Prevent double booking

### 2.6 Attendance

- [ ] Server Action: `markAttendance` (present/no-show + optional notes)
- [ ] Attendance UI on instructor schedule view — mark after session time passes
- [ ] Attendance stats visible on student/guardian dashboard

**Phase 2 deliverable:** Full scheduling — admin creates sessions across instructors, instructor sets availability, students see their calendar, optional self-booking, attendance tracking.

---

## Phase 3 — Dashboards (Days 19–22)

Make the home screens useful for each role.

### 3.1 Student Dashboard

- [ ] Upcoming sessions (next 7 days)
- [ ] Continue learning — enrolled courses with progress bars, "next lesson" link
- [ ] Recent announcements (if any)

### 3.2 Guardian Dashboard

- [ ] Linked student selector (if guardian has multiple)
- [ ] Upcoming sessions for linked student
- [ ] Progress overview across all enrolled courses
- [ ] Recent announcements
- [ ] Read-only — no action buttons

### 3.3 Instructor Dashboard

- [ ] Today's sessions with student names
- [ ] Quick stats: sessions this week, students at 80%+ progress
- [ ] My courses with student counts
- [ ] Recent activity (completions, new enrollments)

### 3.4 Admin Dashboard

- [ ] Overview stats: users, courses, sessions today
- [ ] Today's sessions across all instructors
- [ ] Recent activity feed
- [ ] Quick links: manage users, manage courses, view schedule

**Phase 3 deliverable:** Each role lands on a useful dashboard showing what they need to know.

---

## Phase 4 — Optional Modules (Days 23–32)

Enable additional modules per course.

### 4.1 Announcements Module

- [ ] Add `Announcement` model, add `'announcements'` to module enum
- [ ] Server Actions: `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`
- [ ] Announcement editor (title + body, Markdown)
- [ ] Announcement list on course page
- [ ] Pin latest announcement to course overview
- [ ] Show on student/instructor/guardian dashboards

### 4.2 Assignments Module

- [ ] Add `Assignment`, `Submission` models, add `'assignments'` to module enum
- [ ] Server Actions: `createAssignment`, `submitAssignment`, `gradeSubmission`
- [ ] Assignment creation (title, description, due date) — within a lesson or standalone
- [ ] Student submission view — text input + link URL field
- [ ] Instructor grading view — read submission, enter grade + feedback
- [ ] Status tracking: not submitted → submitted → reviewed/needs revision
- [ ] Student notification when graded
- [ ] Show due soon on student dashboard

### 4.3 Gradebook Module

- [ ] Add `'gradebook'` to module enum (no new models — aggregates Assignment + Submission)
- [ ] Student gradebook view — own grades across assignments
- [ ] Instructor gradebook view — all students × all assignments, with averages
- [ ] CSV export for instructor

### 4.4 Certificates Module

- [ ] Add `'certificates'` to module enum
- [ ] Certificate page — printable HTML with student name, course title, date, instructor name
- [ ] Trigger: shown when student reaches 100% progress
- [ ] Print-friendly CSS (Ctrl/P+Cmd+P)

**Phase 4 deliverable:** Optional modules working — announcements, assignments with grading, gradebook, printable certificates.

---

## Phase 5 — Admin & Guardian (Days 33–37)

User management and guardian linking.

### 5.1 Admin User Management

- [ ] User list page (`/admin/users`) — search, filter by role
- [ ] Create user (admin can create any role)
- [ ] Edit user (change name, email, role)
- [ ] Deactivate user (soft-delete)
- [ ] Reset password (admin sets new password for user)

### 5.2 Guardian Linking

- [ ] Server Actions: `linkGuardian`, `unlinkGuardian`, `getLinkedStudents`
- [ ] Admin UI: link guardian account to one or more students
- [ ] Guardian can see linked students on their dashboard
- [ ] Guardian can only access linked students' data (enforced in queries)

### 5.3 Admin Course Management

- [ ] Course list page (`/admin/courses`) — all courses, filter by instructor
- [ ] Archive/delete course
- [ ] View course details (enrolled students, modules, progress summary)

**Phase 5 deliverable:** Admin can manage all users, link guardians to students, manage all courses.

---

## Phase 6 — Polish & Deploy (Days 38–42)

Make it production-ready.

### 6.1 Mobile Polish

- [ ] Test all pages on 320px viewport
- [ ] Fix any layout issues (tables, calendars, forms)
- [ ] Touch target audit (all interactive elements ≥ 44px)
- [ ] Bottom navigation for mobile (home, schedule, courses, profile)

### 6.2 Performance

- [ ] Lighthouse audit — target > 90 on all metrics
- [ ] Image optimization (if any external images used)
- [ ] Bundle analysis — remove unused dependencies
- [ ] Database query optimization (N+1 queries, indexes)

### 6.3 Security Audit

- [ ] Middleware: verify all protected routes
- [ ] Test: student can't access other students' data
- [ ] Test: guardian can't access non-linked students' data
- [ ] Test: instructor can't manage other instructors' courses
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all Server Actions (Zod)

### 6.4 Vercel Deployment

- [ ] Set up Vercel project, connect GitHub repo
- [ ] Add Vercel Postgres integration
- [ ] Set environment variables
- [ ] Run production migration
- [ ] Seed production data (or manual setup)
- [ ] Test production deployment
- [ ] Set up custom domain (optional)

### 6.5 Documentation

- [ ] Update README with final screenshots
- [ ] Verify all docs are accurate (PRD, ARCHITECTURE, DEVELOPMENT, CONTRIBUTING)
- [ ] Add deployment guide to README
- [ ] Document seed data and default accounts

**Phase 6 deliverable:** Production-ready app deployed on Vercel, documented, tested.

---

## Task Dependencies

```
Phase 0 (Foundation)
    │
    ├──► Phase 1 (Courses & Lessons)
    │        │
    │        ├──► Phase 3 (Dashboards) — needs courses + progress data
    │        │
    │        └──► Phase 4 (Optional Modules) — needs courses + lessons
    │
    └──► Phase 2 (Scheduling) — can start in parallel with Phase 1
             │
             └──► Phase 3 (Dashboards) — needs scheduling data

Phase 5 (Admin & Guardian) — depends on Phase 1 + 2

Phase 6 (Polish & Deploy) — depends on all above
```

**Parallel opportunities:**
- Phase 1 and Phase 2 can be built in parallel (different features, shared foundation)
- Phase 4 modules are independent of each other (announcements, assignments, gradebook, certificates can be built in any order)

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|---|---|---|
| 0 — Foundation | 3 days | Day 3 |
| 1 — Courses & Lessons | 7 days | Day 10 |
| 2 — Scheduling | 8 days | Day 18 |
| 3 — Dashboards | 4 days | Day 22 |
| 4 — Optional Modules | 10 days | Day 32 |
| 5 — Admin & Guardian | 5 days | Day 37 |
| 6 — Polish & Deploy | 5 days | Day 42 |

**Total: ~6 weeks** for a solo developer working full-time.

If building with a small team (2-3 devs), Phases 1 and 2 can overlap, reducing total time to ~4 weeks.

---

## MVP vs Full v1

**MVP (minimum viable — Phase 0 + 1 + 2 + 3):**
- Auth, courses, lessons, progress, scheduling, dashboards
- ~3 weeks
- Enough for the training center use case

**Full v1 (Phase 0 through 6):**
- All optional modules, admin panel, guardian linking, polished
- ~6 weeks
- Ready for anyone to fork and deploy
