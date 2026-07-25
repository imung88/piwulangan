# Development Guide

## Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **PostgreSQL** 14+ (local or Neon)
- **npm** or **pnpm**

## Quick Setup

### Option A: Local Postgres (Docker)

```bash
# Start a local Postgres container (dev only)
docker run --name piwulangan-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=piwulangan \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### Option B: Neon (free tier)

1. Create account at [neon.tech](https://neon.tech)
2. Create a database
3. Copy the connection string

### Setup

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/piwulangan.git
cd piwulangan
npm install

# Configure environment
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/piwulangan
NEXTAUTH_SECRET=any-ra…-dev
NEXTAUTH_URL=http://localhost:3000
```

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed sample data
npx prisma seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev          # Start dev server (with hot reload)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Run Prettier
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:reset     # Reset database (drop + migrate + seed)
```

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full project structure.

Key directories:

```
src/
├── app/              # Pages and routes (Next.js App Router)
├── components/       # React components
├── lib/              # Utilities, auth, database, scheduling engine
├── actions/          # Server Actions (mutations)
└── types/            # TypeScript types
```

## Working with the Database

### Schema Changes

1. Edit `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name your-migration-name`
3. Prisma generates the migration SQL automatically

### Viewing Data

```bash
npx prisma studio
```

Opens a web GUI at [http://localhost:5555](http://localhost:5555).

### Seeding

Edit `prisma/seed.ts` to modify seed data. Run with:

```bash
npx prisma db seed
```

## Working with UI

### Adding Components (shadcn/ui)

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add calendar
```

Components are added to `src/components/ui/`.

### Tailwind CSS

Tailwind is configured in `tailwind.config.ts`. The design system uses:

- **Colors:** Slate (neutral), Blue (primary)
- **Breakpoints:** sm (640px), md (768px), lg (1024px)
- **Spacing:** Default Tailwind scale

## Authentication

We use NextAuth.js v5 with a Credentials provider.

### Test Users (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| Instructor | `teacher@example.com` | `teacher123` |
| Student | `student@example.com` | `student123` |
| Guardian | `guardian@example.com` | `guardian123` |

### Auth Flow

1. User submits email + password
2. Server verifies with bcrypt
3. JWT session created
4. Role stored in JWT
5. Middleware checks role on each request

## Key Features Implementation Notes

### Scheduling (Core)

The scheduling engine lives in `src/lib/schedule.ts`:

```
getAvailableSlots(instructorId, courseId, date)
  → fetches availability for that day of week
  → subtracts blocked dates
  → generates time slots (duration + buffer)
  → subtracts existing bookings
  → returns available slots
```

Admin creates sessions directly via `src/actions/schedule.ts`. Student self-booking uses the same engine but is gated by `course.studentBookingEnabled`.

### Progress Tracking

Simple upsert on the `Progress` table:

```typescript
await prisma.progress.upsert({
  where: { userId_lessonId: { userId, lessonId } },
  update: { completed: true, completedAt: new Date() },
  create: { userId, lessonId, completed: true, completedAt: new Date() }
});
```

### Module System

Modules are toggled via `course.enabledModules[]`. Route layouts check this array and conditionally render navigation. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the extension contract.

## Common Issues

### "Can't reach database server"

- Make sure PostgreSQL is running
- Check `DATABASE_URL` in `.env.local`
- If using Docker: `docker ps` to check container status

### "Module not found" after pulling changes

```bash
npm install
npx prisma generate
```

### Migrations fail

```bash
npx prisma migrate reset
```

⚠️ This deletes all data in the database.

## Code Quality

Before submitting a PR:

```bash
npm run build    # Check for type errors
npm run lint     # Check for lint issues
npm run format   # Auto-fix formatting
```

## Questions?

Open an issue or check the [Contributing Guide](./CONTRIBUTING.md).
