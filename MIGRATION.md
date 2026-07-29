# Database Migration Plan — PostgreSQL → SQLite (local) → Turso (production)

**Project**: Piwulangan (Next.js 15 LMS, Prisma 6, NextAuth v5)
**Strategy**: Two phases. Phase 1 switches development to a plain local SQLite file (no Docker, no cloud). Phase 2 adds Turso for Vercel deployment later, with zero schema changes.
**Data**: All current data is placeholder — no data migration needed. Drop Postgres, re-seed SQLite.

> Steps marked **[YOU]** require manual action by the project owner. Everything else can be done by the coding agent.

---

## Status (updated 2026-07-29)

- ✅ **Phase 1 complete.** Local dev runs on `prisma/dev.db`. Verified via build + manual testing.
- ✅ **Phase 2 steps 2.1–2.2 complete.** Adapter installed (`@prisma/adapter-libsql@6.19.3`, pinned to the Prisma version) and `src/lib/db.ts` is env-aware. Local behavior unchanged — the Turso path only activates when `TURSO_DATABASE_URL` is set.
- ⬜ **Remaining before/at deployment:**
  - **[YOU]** §1.8: remove the old Docker Postgres container: `docker rm -f piwulangan-db`
  - **[YOU]** §2.3: create Turso account, database, and auth token
  - §2.4: push schema to Turso (`prisma migrate diff` + `turso db shell`)
  - **[YOU]** §2.5: set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `NEXTAUTH_URL` in Vercel
  - §2.6: deploy + smoke test

Implementation notes discovered during 2.1–2.2 (already applied):

- `driverAdapters` is GA in Prisma 6.19 — **no** `previewFeatures` flag needed in `schema.prisma` (adding it triggers a deprecation warning).
- The adapter version must match the Prisma version: install `@prisma/adapter-libsql@6.19.3`, not `latest` (latest is 7.x and incompatible with Prisma 6).
- libsql ships native binaries; `next.config.mjs` needs `serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql"]` or `next build` fails with webpack README.md parse errors.
- `new PrismaLibSQL({ url, authToken })` takes the libsql config directly (no separate `createClient` call needed in 6.19).

---

## Why this order?

- SQLite `file:./dev.db` gives instant local dev: no Docker container, no connection issues, `db:reset` in seconds.
- The schema and all app code are identical between local SQLite and Turso — Turso speaks the SQLite dialect over libSQL. The **only** difference is the connection layer in `src/lib/db.ts`, switched by environment variables.
- Deferring Turso means no account/token setup is needed until deployment (Phase 6 of DEVELOPMENT_PLAN.md).

---

## Phase 1 — Local SQLite (do now)

### 1.1 Switch the Prisma datasource

`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### 1.2 Clean the schema of Postgres-only annotations

- Remove all 8 `@db.Text` annotations (Course.description, Lesson.content, ClassSession.description, Notification.body, Assignment.description, Submission.textContent, Submission.feedback, Announcement.body). Columns become plain `String` — SQLite TEXT has no length limit, so nothing is lost.
- Remove both `@db.Date` annotations (`BlockedDate.date`, `ClassSession.date`). See §1.5 for the behavioral consequence.
- **Keep all 8 enums.** Prisma 6 supports enums on SQLite, stored as TEXT. Note: unlike Postgres, the DB itself won't reject invalid values — validation happens in Prisma/Zod only. Acceptable for this app.
- Everything else (cuid IDs, `@@unique`, `@@index`, `Float`, relations, cascades) works unchanged.

### 1.3 Fix the one code-level incompatibility

`src/actions/admin.ts:31-32` uses `mode: "insensitive"` (Postgres ILIKE). **Prisma throws at runtime on SQLite.** Remove the `mode` option:

```ts
// before
{ name: { contains: query, mode: "insensitive" } }
// after
{ name: { contains: query } }
```

SQLite's `LIKE` is case-insensitive for ASCII by default, so search behavior is preserved for this app's data.

This is the **only** code break in the entire codebase — there is no raw SQL, no `skipDuplicates`, no upserts, no JSON/array columns in the current schema.

### 1.4 Reset migration history

The old migrations contain `CREATE TYPE ... AS ENUM` and a `TEXT[]` column — unportable to SQLite. Since there's no production data:

```bash
rm -rf prisma/migrations        # includes migration_lock.toml; regenerated automatically
npx prisma migrate dev --name init
```

### 1.5 Update environment files

`.env`, `.env.local`, `.env.example`:

```bash
DATABASE_URL="file:./dev.db"
```

(`AUTH_SECRET` and `NEXTAUTH_URL` unchanged. `.gitignore` already ignores `prisma/*.db`.)

Note: with `provider = "sqlite"` the path is relative to `prisma/`, so the file lands at `prisma/dev.db` — already gitignored.

### 1.6 Re-seed and verify date semantics

```bash
npm run db:seed
```

Also add to `package.json` so `prisma migrate reset` auto-seeds:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

**Date-boundary check**: with `@db.Date` gone, `ClassSession.date` and `BlockedDate.date` store full timestamps. The seed and `createSession` already zero the time to midnight, so stored values are fine. But verify queries that compare against `new Date()` (with current time) instead of a midnight-truncated date:

- `src/app/(dashboard)/dashboard/page.tsx:38` — `gte: new Date()` would now exclude *today's* sessions after 00:00. Change to a start-of-today date.
- Audit the range filters in `src/lib/schedule.ts:57-58,76,93-94,111-112` and the other `date:` filters in dashboard/course/lesson pages — those already use explicit day-start/day-end boundaries and should be fine, but confirm.

### 1.7 Smoke test locally

`npm run dev`, then:

- Log in as each seeded role (admin / instructor / student / guardian).
- Admin user search (the §1.3 fix) — search by partial name, mixed case.
- Create a course + lesson with long text content (ex-`@db.Text` fields).
- Schedule a recurring class session (exercises `$transaction` + `createMany` at `src/actions/schedule.ts:264,278`).
- Today's session appears on the dashboard (the §1.6 date fix).
- Delete a course → related lessons/enrollments cascade (FK enforcement: Prisma sets `PRAGMA foreign_keys = ON`).
- Toggle lesson progress, send an announcement, check notifications.

### 1.8 Update docs + housekeeping

- `SETUP.md`: delete the Docker Postgres section (lines ~32-48) and troubleshooting; local setup becomes `npm install && npx prisma migrate dev && npm run db:seed && npm run dev`.
- `ARCHITECTURE.md`: replace "Vercel Postgres (Neon)" references (lines 9, 154-161, 272-273) with SQLite/Turso; resolve the deferred note at line 314.
- `README.md:5` and `DEVELOPMENT_PLAN.md:5,117`: update stack description.
- Remove `MIGRATION.md` from `.gitignore` so this plan is version-controlled.
- **[YOU]** Stop/remove the `piwulangan-db` Docker container when you're confident: `docker rm -f piwulangan-db` (rollback becomes harder after this — see §Rollback).

---

## Phase 2 — Turso on Vercel (at deployment time)

Local dev keeps using `file:./dev.db` forever; Turso is production-only.

### 2.1 Install the driver adapter — ✅ done

Contrary to the previous version of this plan, Turso is **not** reachable through Prisma's plain SQLite provider. It needs the libSQL driver adapter:

```bash
npm install @prisma/adapter-libsql@6.19.3 @libsql/client   # pin to the Prisma version!
```

No schema change needed — `driverAdapters` is GA in Prisma 6.19. Webpack can't bundle libsql's native binaries, so `next.config.mjs` externalizes them:

```js
serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql"]
```

### 2.2 Make `src/lib/db.ts` environment-aware — ✅ done

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

function createClient() {
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient(); // local: uses DATABASE_URL = file:./dev.db
}
```

(Keep the existing `globalThis` singleton wrapper around `createClient()`.)

This is the entire local↔production difference: two env vars. Schema, migrations, seed, and app code are shared.

### 2.3 Create the Turso database — **[YOU]**

```bash
# Install Turso CLI, then:
turso auth signup           # or: turso auth login
turso db create piwulangan
turso db show piwulangan --url          # → TURSO_DATABASE_URL
turso db tokens create piwulangan       # → TURSO_AUTH_TOKEN
```

### 2.4 Apply schema to Turso

`prisma migrate deploy` doesn't speak libSQL directly. Simplest reliable path:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > init.sql
turso db shell piwulangan < init.sql
```

(For future schema changes: generate the diff from the previous migration state and pipe it the same way, or use `turso db shell` to apply the new migration's SQL.)

Seed production data via a one-off script pointed at Turso (set `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` locally and run a libSQL-aware seed), or create the initial admin user through the app.

### 2.5 Configure Vercel — **[YOU]**

In the Vercel project settings, add environment variables:

- `TURSO_DATABASE_URL` = `libsql://piwulangan-<org>.turso.io`
- `TURSO_AUTH_TOKEN` = (from §2.3)
- `AUTH_SECRET`, `NEXTAUTH_URL` as usual

`DATABASE_URL` can be set to `file:./dev.db` on Vercel too — Prisma requires it to exist for schema validation, but the adapter bypasses it at runtime.

### 2.6 Deploy and smoke test

Run the §1.7 checklist against the deployed app.

---

## Risks & mitigations

| Concern | Impact | Mitigation |
|---|---|---|
| Enum values not DB-enforced on SQLite | Low — Prisma client + Zod validate | Accept; no raw SQL exists that could insert bad values |
| `mode: "insensitive"` runtime crash | High if missed | Fixed in §1.3; grep for `insensitive` before finishing |
| Date semantics after `@db.Date` removal | Medium — off-by-one-day bugs | §1.6 fix + §1.7 dashboard test |
| `createMany` runs sequentially on SQLite | Negligible — batches < 100 rows | None needed |
| SQLite single-writer locking | Low at 3–50 users | Turso handles concurrency server-side; monitor after launch |
| Local/prod drift | Low | Same schema + migrations; only `db.ts` branches on env |
| Adapter/Prisma version drift | Medium — 7.x adapter breaks with Prisma 6 | Keep `@prisma/adapter-libsql` pinned to the exact `prisma` version when upgrading either |

## Rollback

Until the Docker container is removed (§1.8): `git checkout` the schema/env changes, restart `piwulangan-db`, `npx prisma migrate deploy`. After that, rollback = recreate the container and re-run the old migrations from git history, then re-seed (no real data at stake).

---

## Steps requiring your intervention (summary)

1. **§1.8** — remove the Docker Postgres container (when confident).
2. **§2.3** — create Turso account, database, and auth token.
3. **§2.5** — set environment variables in the Vercel dashboard.

Everything else is automatable.

## References

- Prisma + Turso: https://www.prisma.io/docs/orm/overview/databases/turso
- Prisma SQLite connector: https://www.prisma.io/docs/orm/overview/databases/sqlite
- Turso docs: https://docs.turso.tech
