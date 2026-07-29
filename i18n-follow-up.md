# i18n — Status & Next Steps

**Date:** 2026-07-28
**Default locale:** `id` (Indonesian, formal register)
**Secondary locale:** `en`
**Status labels kept in English:** Published, Draft, Pinned (per user decision; also Archived in `CoursesClient`)
**Build:** `npm run build` — ✅ 27 routes, no TypeScript errors. ESLint rushstack warning cosmetic / pre-existing — ignore.
**Commits handled by user — not tracked here.**

---

## What's done ✅

### Phase 1 — Infrastructure
- `src/lib/i18n/LocaleProvider.tsx` — `use client`, cookie reader, React Context
- `src/lib/i18n/useT.ts` — `use client`, `useT()` hook + **`format()`** interpolation helper (NEW this session)
- `src/lib/i18n/locales/id.ts` + `en.ts` — dictionaries (greatly expanded)
- `src/components/LocaleSwitcher.tsx` — 🌐 ID↔EN toggle
- `src/app/(dashboard)/layout.tsx` + `LayoutContent.tsx` — sidebar + header via `useT` inside ONE shared `LocaleProvider`
- `src/app/(auth)/login/page.tsx`, `signup/page.tsx` — full forms localized
- `src/app/(dashboard)/profile/page.tsx` + `ProfileContent.tsx` + `LanguageSelector.tsx` + `RoleBadge.tsx`

### Tier 1 — Dashboard + Courses (completed 2026-07-28)
### Tier 2 — Course management ✅ DONE
All 11 files localized.
#### What was built
- **`src/lib/i18n/serverT.ts`** — NEW. `resolveLocale()` (server-safe cookie reader) + `serverT()` (server-component dict lookup) + `formatT()` (server interpolation). Solves the key structural problem: Tier-1 course pages are *server* components but needed localized labels. Pattern: pre-await a `labels` object at the top of the async function body, then reference `labels.foo` in JSX.
- **`src/app/(dashboard)/dashboard/DashboardClient.tsx`** — NEW. `"use client"`, exports `DashboardClient` plus 4 internal named components (`StudentDashboard`, `InstructorDashboard`, `GuardianDashboard`, `AdminDashboard`) all using `useT()`. All ~45 dashboard label replacements done.
- **`src/app/(dashboard)/dashboard/page.tsx`** — slimmed to thin server component that passes data into `DashboardClient`.
- **`src/app/(dashboard)/courses/page.tsx`** — added `serverT` labels for header: "All courses", "+ New Course", "My courses", guardian description.
- **`src/app/(dashboard)/courses/CoursesClient.tsx`** — `useT` + `format`: dismiss, archive/unarchive toggle, archived badge, module/student counts, lessons progress, empty states per role.
- **`src/app/(dashboard)/courses/BrowseCourses.tsx`** — section heading, module count, Enroll/Join buttons, invite-code placeholder, "Enter Invite Code", "Enrollment by instructor", "View details".
- **`src/app/(dashboard)/courses/new/page.tsx`** — full form: back, title, all labels, placeholders, enrollment-mode dropdown options, create/creating button.
- **`src/app/(dashboard)/courses/[courseId]/page.tsx`** — full localization: not-available, preview (modules+lessons pluralized, enroll-now/open/invite/managed text), header (code badge, schedule/settings links), next-session block (label, lesson link, view-schedule), guardian progress labels, student progress ("X of Y lessons completed"), continue-link, announcements section, course-content header, module heading (with `{order}` interpolation), no-lessons/no-content/add-modules, view-members.

#### New namespaces added to both dictionaries
`courses.*`, `browse.*`, `newCourse.*`, `courseDetail.*`, plus `common.modulePlural/lessonPlural`, `instructor.modules`, `guardian.lessons`.

#### Design decisions locked (lessons from this session)
1. **Server vs client split:** For server components, use `serverT.ts` (pre-await a `labels` object). For `"use client"` components, use `useT()`. Never import `useT` into a server component.
2. **Interpolation:** client `format(t("courses.moduleCount"), { n: 5 })`; server `formatT(labels.moduleLabel, { order: 2 })`. Both follow `{key}` placeholder convention.
3. **Plurals:** Indonesian has no singular/plural distinction (always "modul"/"pelajaran"). English dict uses plural forms ("modules"/"lessons") — for "1 module" singular, use `word.replace(/s$/, "")`.
4. **Status labels:** "Published", "Draft", "Pinned", "Archived" kept in English per user decision.
5. **`toLocaleDateString()` calls:** left untouched — these render the browser locale, outside i18n scope.
6. **Server action error strings** (`result.error` raw English): NOT localized yet. These are Tier-6 items. Leave them; they only show on failure.
7. **No new `LocaleProvider`.** All components that use `useT()` must sit inside the one shared provider in `LayoutContent.tsx`.

#### Key refactoring lesson (for next tiers)
The `[courseId]/page.tsx` refactor showed the cleanest pattern for big server-component pages:
- pre-fetch ONE `labels` object via parallel `await serverT(...)` calls at the top of the function body
- drop `formatT` and `labels.*` into JSX inline
- for strings that need pluralization, compute with `plural()` helper that trims the trailing "s" in English only
This kept the data-fetching code completely untouched and made the build trivially verifiable.

---

## Stats
| Metric | Value |
|---|---|
| Files created this project | 10+ |
| Files modified | ~18 |
|| Strings localized so far | ~410 (up from ~330) |
|| Strings remaining | ~200 across ~8 files |
|| Completed | **Tiers 1, 2, 3 & 4** |

---

## What still needs translating (remaining priority list)

### Tier 2 — Course management ✅ DONE
All 11 files localized. Dictionaries added namespaces `lesson.*`, `content.*`, `schedule.*`, `settings.*`.
- `courses/[courseId]/schedule/page.tsx`, `courses/[courseId]/members/page.tsx`, `courses/[courseId]/announcements/page.tsx`, `courses/[courseId]/UnenrollButton.tsx`, `courses/[courseId]/manage/announcements/page.tsx`, `courses/[courseId]/manage/students/page.tsx`, `courses/[courseId]/manage/students/StudentActions.tsx` — done
- `courses/[courseId]/lessons/[lessonId]/page.tsx` — done
- `courses/[courseId]/manage/content/page.tsx` + `LessonEditForm.tsx` — done
- `courses/[courseId]/manage/schedule/page.tsx` + `ManageScheduleClient.tsx` — done
- `courses/[courseId]/manage/settings/page.tsx` — done
- Bugfixes: `courseSchedule.title` now interpolates `{title}`; `members.students` now interpolates `{n}`.

### Tier 3 — Scheduling & availability ✅ DONE (completed 2026-07-28)
All 8 files localized. New namespaces added: `days.*`, `availability.*`, `blocked.*`, `scheduleView.*`, `dashboardSchedule.*`. Added `useDayNames()` helper in `useT.ts`.
- `schedule/page.tsx` — `serverT` labels for all 4 role-specific headers
- `schedule/availability/page.tsx` — `serverT` for title/desc/sections, localized day names
- `schedule/availability/AvailabilityForm.tsx` — `useT()` + `useDayNames()` for day/time/course labels
- `schedule/availability/BlockedDatesSection.tsx` — localized heading, labels, "Block Date"/"Remove"
- `components/schedule/ScheduleView.tsx` — list/calendar toggle
- `components/schedule/SessionList.tsx` — filters, "Today" badge, "Join link", "Reason:", empty states
- `components/schedule/WeekCalendar.tsx` — "Today" button, "No sessions this week" (weekday labels via `toLocaleDateString` — out of scope per design decision #5)
- `components/schedule/AvailabilityDisplay.tsx` — added `"use client"`, localized paragraphs, day labels via `useDayNames()`

**CRITICAL LESSON:** `src/lib/schedule.ts` is the schedule DATA LAYER (`getSessions*`, `startOfToday`, `DAY_NAMES`). Do NOT edit it for localization. Day-name localization lives in `useT.ts` / `useDayNames()` only.

### Tier 4 — Admin, misc & shared ✅ DONE (completed 2026-07-28)
New namespaces added to both `id.ts` and `en.ts`: `adminUsers.*`, `adminSchedule.*`, `announcementsPage.*`, `notificationsPage.*`, `bell.*`.
- `admin/users/page.tsx` — header title + description via `serverT`
- `admin/users/AdminUsersClient.tsx` — table headers, role filter, create/edit/reset modals, link/unlink guardian modal via `useT` + `format`. Server-action toast strings left untouched (Tier 6 scope). Role badges keep raw DB role codes (technical identifiers).
- `admin/schedule/page.tsx` — title, desc, "Courses"/"All sessions" headings, empty state via `serverT`
- `announcements/page.tsx` — title, role-specific descriptions, "No announcements", "Manage →" via `serverT`
- `notifications/page.tsx` — title + description via `serverT`
- `notifications/NotificationsClient.tsx` — empty state, unread counter (localized singular/plural), "Mark all as read" via `useT` + `format`
- `components/NotificationBell.tsx` — "Notifications", "Mark all read", "No notifications", "View all →" via `useT`
- `components/MobileNav.tsx` — **critical**: replaced hardcoded English nav labels (Home, Courses, Schedule, News, Profile) with `useT` referencing existing `nav.*` keys. Now fully locale-aware.

**Build:** ✅ 27 routes, no TypeScript errors.

### Tier 6 — Server action messages ✅ DONE (completed 2026-07-29)
New namespace `errors.*` added to both `id.ts` and `en.ts` (29 keys).

**Approach chosen:** Instead of the originally-planned "return a key, resolve with `t()` at the caller", the actions now return **already-localized strings** via `await serverT("errors.*")`. `serverT` reads the `lang` cookie from request headers, which works inside server actions. This needed **zero consumer changes** — every caller already renders `result.error` as a string (`typeof result.error === "string" ? result.error : fallback`), and the object/fieldError branch is untouched.

Files edited (imports + error returns): `actions/auth.ts`, `actions/admin.ts`, `actions/courses.ts`, `actions/lessons.ts`, `actions/schedule.ts`, `actions/guardians.ts`. (`announcements.ts`, `notifications.ts`, `progress.ts` had no raw error strings — only Zod fieldErrors / success.)

Localized:
- All raw string `return { error: "..." }` messages.
- Custom object-literal messages that were hand-written English, not Zod: `emailExists` (auth + admin ×2), `loginFailedAfterSignup` (auth), `endTimeAfterStart` availability field error (schedule).

**Intentionally left as-is:** `parsed.error.flatten().fieldErrors` from Zod schemas (e.g. "Name must be at least 2 characters"). These are schema-level validation messages defined at module load; localizing them is a separate concern (would need per-field key mapping or a Zod error map). Out of Tier 6 scope.

**Build:** ✅ 25 routes, no TypeScript errors.

---

## Localization pattern to follow
1. **Client component:** `import { useT } from "@/lib/i18n/useT"; const t = useT();` then `{t("namespace.key")}`.
2. **Client interpolation:** `import { format } from "@/lib/i18n/useT"; {format(t("courses.moduleCount"), { n: 3 })}`.
3. **Server component:** `import { serverT, formatT } from "@/lib/i18n/serverT";` then pre-await a `labels` object: `const labels = { x: await serverT("ns.x") }` and use `labels.x` + `formatT(labels.x, { n: 3 })` in JSX.
4. **Always add keys to BOTH `id.ts` and `en.ts`** before touching components.
5. Every `useT()` caller MUST be inside the `LocaleProvider` in `LayoutContent.tsx`.
6. New client components need `"use client"` at the top.

## Build verification
```bash
cd /c/MANIM/Piwulangan/piwulangan
npm run build
```
Expect: ✅ 17 routes, no TypeScript errors.

---

## Hydration mismatch — ✅ RESOLVED (2026-07-29)

**Status:** Fixed. Was a dev-only warning where the mobile header hydrated with raw i18n keys (`nav.notifications`, `nav.signOut`) instead of translations.

**Verified root cause (two compounding bugs):**

1. **`readCookie()` returned a garbage locale on the server.** The old code was:
   ```js
   const m = typeof document === "undefined" ? DEFAULT : document.cookie.match(/…lang=([^;]+)/)
   return (m?.[1] ?? DEFAULT)
   ```
   On the server `m` is the DEFAULT *string* `"id"`, so `m?.[1]` indexed into the string → `"id"[1]` === `"d"`. `BUNDLE["d"]` is `undefined`, so `deepGet` fell through to its missing-key branch and returned the **raw key path**. That is why SSR emitted `nav.notifications` / `nav.signOut`. (Confirmed by isolated node run: server → `"d"`, client → correct locale.)

2. **The server could not read the cookie at all.** `layout.tsx` and `LayoutContent.tsx` were both `"use client"`, and `readCookieInitial()` ran at render time. On the server `document` is undefined, so it always fell back to DEFAULT. Even with bug #1 fixed, any `lang=en` user would still mismatch (server `id` vs client `en`).

**Fix applied (option 2 — SSR locale via server component + props):**
- `src/app/(dashboard)/layout.tsx` — converted to an **async server component** that reads the `lang` cookie via `next/headers` `cookies()` and passes `initialLocale` down.
- `src/app/(dashboard)/LayoutContent.tsx` — now accepts `initialLocale` and passes it straight to `<LocaleProvider initial={initialLocale}>`; removed the render-time `readCookieInitial()` call and its import.
- `src/lib/i18n/LocaleProvider.tsx` — fixed the `readCookie()` server branch to return `DEFAULT` directly (no string indexing); removed the now-unused `readCookieInitial` export. `readCookie()` is still used by the client `localechange`/`storage` sync effect.

SSR and the client now derive the locale from the same per-request cookie value, so they agree for every user. **Trade-off:** the `(dashboard)` segment is now always dynamic (`cookies()` opts out of static rendering) — it was already dynamic, except `/courses/new` which flipped from static to dynamic. Acceptable, since locale must be resolved per request.

**Build:** ✅ 25 routes, no TypeScript errors.

## Localization pattern to follow
1. **Client component:** `import { useT } from "@/lib/i18n/useT"; const t = useT();` then `{t("namespace.key")}`.
2. **Client interpolation:** `import { format } from "@/lib/i18n/useT"; {format(t("courses.moduleCount"), { n: 3 })}`.
3. **Server component:** `import { serverT, formatT } from "@/lib/i18n/serverT";` then pre-await a `labels` object: `const labels = { x: await serverT("ns.x") }` and use `labels.x` + `formatT(labels.x, { n: 3 })` in JSX.
4. **Always add keys to BOTH `id.ts` and `en.ts`** before touching components.
5. Every `useT()` caller MUST be inside the `LocaleProvider` in `LayoutContent.tsx`.
6. New client components need `"use client"` at the top.

## Sanity checks after each batch
1. Log in as `admin@example.com` (password `password123`)
2. 👤 Profile → switch language via 🇮🇩/🇺🇸 selector
3. Verify **sidebar labels change** ("Beranda" ↔ "Dashboard") — the whole app switches as one unit.
4. Role badge shows `Administrator` / `Pengajar` / `Siswa` / `Wali Murid`.
5. Confirm "Published", "Draft", "Pinned", "Archived" stay in English.
6. Spot-check placeholders and empty-state strings are in the selected locale.
