# Security Upgrade Preparation

This document tracks the dependency upgrades needed to close known CVEs. The
upgrade itself is **deferred** — this is the runbook for when it's done.

## Known vulnerabilities (from `npm audit`)

| Package | Current | Target | Severity | Advisory / Issue |
|---|---|---|---|---|
| next | 15.1.12 | 15.5.x (latest patch) | **Critical** | GHSA-955p-x3mx-jcvp — unauthenticated disclosure of internal Server Function endpoints |
| next | 15.1.12 | 15.5.x | High | SSRF via improper request handling in server actions |
| next | 15.1.12 | 15.5.x | High | Unbounded Server Action payload (DoS) |
| postcss | (transitive) | latest patched | High | Line-return parsing error |
| sharp | (transitive) | latest patched | High | Bundled libwebp / decoder issues |

> Run `npm audit` again at upgrade time to pick up any newer advisories and to
> confirm the exact patched versions.

## Upgrade commands

```bash
cd piwulangan

# Pin the current patched 15.5 release for both next and its eslint config
npm i next@15.5.x eslint-config-next@15.5.x

# Pull transitive fixes (postcss, sharp) and re-check
npm audit
npm audit fix        # only if it doesn't force-break majors; review the diff

# Verify the app still compiles
npm run build
```

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

- [ ] **Rotate `AUTH_SECRET`** to a strong random value (`openssl rand -base64 32`)
      and set it in the host environment. Never ship the placeholder `"replace-with-a-random-string"`.
- [ ] Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` in the host env — the seed
      refuses to run without them and there is no hardcoded default admin.
- [ ] Confirm no secrets are committed: `git ls-files | grep -i env` should show
      only `.env.example` (never `.env` or `.env.local`).
- [ ] Annotate the test-account tables in `DEVELOPMENT_PLAN.md` / `SETUP.md` as
      **local-dev only** (the `password123` accounts are created only when
      `NODE_ENV !== "production"`).
- [ ] Confirm production seed behavior: with `NODE_ENV=production`, `npm run db:seed`
      creates only the env-derived superadmin and no demo data.
