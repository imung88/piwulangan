# Security Upgrade Preparation

This document tracks the dependency upgrades needed to close known CVEs.

> **Status: DONE (2026-07-30).** `next` + `eslint-config-next` upgraded to
> **15.5.22**; `npm audit` reports **0 vulnerabilities**. Details below.

## Known vulnerabilities (from `npm audit`) — all resolved

| Package | Was | Now | Severity | Advisory / Issue |
|---|---|---|---|---|
| next | 15.1.12 | **15.5.22** | **Critical** | GHSA-955p-x3mx-jcvp — unauthenticated disclosure of internal Server Function endpoints |
| next | 15.1.12 | **15.5.22** | High | SSRF via improper request handling in server actions |
| next | 15.1.12 | **15.5.22** | High | Unbounded Server Action payload (DoS) |
| postcss | 8.4.x | **8.5.25** (direct + `overrides`) | High | Line-return parsing / sourceMappingURL disclosure |
| sharp | 0.33.5 (transitive) | **0.35.3** (via `overrides`) | High | Bundled libwebp / decoder issues |
| brace-expansion | 1.x/2.x (dev, transitive) | **5.0.8** (via `overrides`) | High | GHSA-mh99-v99m-4gvg DoS (eslint/sucrase chain, dev-only) |

## Changes made during the upgrade

- `package.json`: pinned `next` / `eslint-config-next` to `15.5.22`; added an
  `overrides` block (postcss, sharp, brace-expansion); `lint` script changed
  from the deprecated `next lint` (removal slated for Next 16) to `eslint .`.
- `eslint.config.mjs`: rewritten to the official `FlatCompat` pattern —
  eslint-config-next 15.5 no longer supports the function-call import style.
  Added ignores for `.next/`, `out/`, `next-env.d.ts`, `prisma/migrations/`.
  New devDep: `@eslint/eslintrc`.
- `src/actions/reports.ts`: renamed a local `module` variable to
  `courseModule` (`@next/next/no-assign-module-variable` error).

## Re-test checklist (after upgrade)

The Next 14 → 15 async `params` / `searchParams` migration is already done, so
risk is low — but re-verify:

- [ ] `npm run build` completes cleanly (expect ~27 routes)
- [ ] Login and logout work (credentials provider)
- [ ] A course-manage flow (create/edit) works for a teacher/admin
- [ ] A lesson page renders (including HTML content escaping)
- [ ] Schedule / availability pages load
- [ ] No new CSP violations in the browser console (nonce CSP lives in `src/middleware.ts`)

## Pre-publish / pre-deploy checklist

Do these **before** pushing to a public GitHub repo and before any production deploy:

- [ ] Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` in the host env — the seed
      refuses to run without them and there is no hardcoded default admin.
- [ ] Confirm no secrets are committed: `git ls-files | grep -i env` should show
      only `.env.example` (never `.env` or `.env.local`).

