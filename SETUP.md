# Local Development Setup — Piwulangan

Step-by-step guide to get Piwulangan running on your machine.

---

## Prerequisites

- **Node.js** 20+ (Next.js 15 requires it; v22 is fine)
- **Docker** (for local PostgreSQL)
- **npm** (you're using npm)

---

## Step 1: Clone the Repo

```bash
git clone https://github.com/imung88/piwulangan.git
cd piwulangan
```

---

## Step 2: Install Dependencies

```bash
npm install
```

---

## Step 3: Start PostgreSQL (Docker)

```bash
docker run --name piwulangan-db \
  -e POSTGRES_PASSWORD=*** \
  -e POSTGRES_DB=piwulangan \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Verify it's running:

```bash
docker ps
```

You should see `piwulangan-db` in the list.

---

## Step 4: Configure Environment

```bash
cp .env.example .env.local
```

The default `.env.local` should work out of the box with the Docker database:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/piwulangan"
AUTH_SECRET="replac…ring"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a random `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Paste the output as the value of `AUTH_SECRET` in `.env.local`.

---

## Step 5: Run Database Migrations

```bash
npm run db:migrate
```

This creates all the tables in the database. When prompted for a migration name, type `init`.

---

## Step 6: Seed Test Data

```bash
npm run db:seed
```

This creates sample users, courses, lessons, and enrollments.

**Test accounts (all passwords: `password123`):**

| Role | Email | What you can do |
|---|---|---|
| Admin | `admin@example.com` | Everything — manage users, courses, schedules |
| Instructor | `teacher@example.com` | Manage own courses, view own students |
| Instructor | `teacherb@example.com` | Second teacher (Piano 101) |
| Student | `alice@example.com` | View enrolled courses, track progress |
| Student | `bob@example.com` | View enrolled courses |
| Guardian | `guardian@example.com` | View Alice's progress (read-only) |

---

## Step 7: Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll be redirected to the login page. Sign in with any test account.

---

## What's Built (Phase 0 – 5)

### Auth
- Login / signup with email + password
- Role-based access control (admin, instructor, student, guardian)
- Route protection via middleware

### Scheduling
- Course-centric scheduling with sessions, availability blocks, and instructor availability
- Admin schedule management
- Instructor availability editor
- Student schedule viewer

### Courses
- Create new course (title, description, enrollment mode)
- Course list page (role-aware: shows enrolled courses for students, own courses for instructors)
- Course overview with module/lesson tree, progress bar, announcements
- Edit course settings (title, description, enrollment mode)
- Publish / unpublish / archive course
- Delete course
- Invite code enrollment (students enter code to join)
- Manual enrollment (instructor/admin adds students)

### Lessons
- Create lessons within modules (title, duration)
- Lesson viewer with markdown content rendering
- Resource links (Google Drive, external URLs)
- Previous / Next navigation between lessons
- Edit and delete lessons

### Modules
- Create modules within a course
- Edit and delete modules
- Content editor page for managing course structure

### Progress Tracking
- "Mark as Complete" button on each lesson
- Toggle completion (mark/unmark)
- Progress bar on course overview
- Checkmarks on lesson list
- Instructor view: per-student progress table

### Announcements
- Course-level announcements with pinning
- Announcements management (create, edit, delete, pin/unpin)

### Members
- Course roster page showing all enrolled students
- Per-student progress percentage

### Dashboards
- Admin: quick links to manage users, courses, schedule
- Instructor: today's sessions, my courses with student counts
- Student: upcoming sessions, course progress bars
- Guardian: linked student's progress (read-only)

### Admin & User Management
- Admin user management (create, edit, delete, role assignment)
- Guardian linking to student accounts

---

## Useful Commands

```bash
npm run dev          # Start dev server (hot reload)
npm run build        # Test production build
npm run lint         # Check for lint issues
npm run db:studio    # Open Prisma Studio (database GUI at localhost:5555)
npm run db:migrate   # Create new migration after schema changes
npm run db:seed      # Re-seed the database
npm run db:reset     # Reset database (drop + migrate + seed)
```

**Schema changes:** edit `prisma/schema.prisma`, then `npm run db:migrate -- --name your-migration-name`.

**Before a PR:** run `npm run build` (type check) and `npm run lint`.

---

## What to Try After Setup

1. **Log in as admin** (`admin@example.com`) → see admin dashboard, create a course
2. **Log in as teacher** (`teacher@example.com`) → see "English Basics", edit content, view student progress
3. **Log in as Alice** (`alice@example.com`) → see 2 courses, mark lessons complete, watch progress bar grow
4. **Log in as guardian** (`guardian@example.com`) → see Alice's progress (read-only)
5. **Visit Prisma Studio** (`npm run db:studio`) → browse the database directly

---

## What's NOT Built Yet

- **Assignments module** — create assignments, student submissions, instructor grading with feedback (Phase 4.2)
- **Deployment** — Vercel or other production deployment (Phase 6)
- **Tests & audit** — automated tests, SEO audit, deployment config (not yet started)

> Note: This is a local development setup guide. For project-level scope and status, see `DEVELOPMENT_PLAN.md` in the parent folder.

---

## Troubleshooting

**"Can't reach database server"**
- Make sure Docker is running: `docker ps`
- Restart the container: `docker restart piwulangan-db`

**"Environment variable not found: DATABASE_URL"**
- Make sure `.env.local` exists and has `DATABASE_URL`

**"Module not found" after pulling changes**
- Run `npm install` again

**Migrations fail**
- Nuclear option: `npm run db:reset` (deletes all data, re-seeds)

**Port 5432 already in use**
- Stop the conflicting process, or use a different port:
  ```bash
  docker run --name piwulangan-db -e POSTGRES_PASSWORD=*** -e POSTGRES_DB=piwulangan -p 5433:5432 -d postgres:16-alpine
  ```
  Then update `.env.local`: `DATABASE_URL="postgresql://postgres:password@localhost:5433/piwulangan"`
