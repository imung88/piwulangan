# Piwulangan

A lightweight learning-community management app: courses, lessons, progress tracking, scheduling, announcements, and notifications for four roles (Admin, Instructor, Student, Guardian). Bilingual UI (Indonesian/English).

**Stack:** Next.js 15 (App Router, RSC + Server Actions) · NextAuth v5 (JWT) · Prisma + SQLite (Turso in production) · Tailwind CSS (Metro design system)

## Getting Started

See **[SETUP.md](./SETUP.md)** for the full local setup (migrations, seed data, test accounts). No Docker needed — the local DB is a SQLite file.

Quick version:

```bash
npm install
cp .env.example .env.local   # then set DATABASE_URL and AUTH_SECRET
npm run db:migrate && npm run db:seed
npm run dev
```

## Documentation

- [SETUP.md](./SETUP.md) — local development setup, scripts, troubleshooting
- [ARCHITECTURE.md](./ARCHITECTURE.md) — tech stack, structure, key decisions
- [PRD.md](./PRD.md) — product requirements
- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to contribute

## License

MIT — see [LICENSE](./LICENSE).
