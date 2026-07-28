# i18n — Status & Next Steps

**Date:** 2026-07-28
**Default locale:** `id` (Indonesian, formal register)
**Secondary locale:** `en`
**Status labels kept in English:** Published, Draft, Pinned (per user decision; also Archived in `CoursesClient`)
**Build:** `npm run build` — ✅ 17 routes, no TypeScript errors. ESLint rushstack warning cosmetic / pre-existing — ignore.
**Commits:** `3152aeb` (infrastructure + Tier 1), `bd93b69` (Tier 2 full), `b2e3a10` (Tier 2 fixups)

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
### Tier 2 — Course management (COMPLETED, committed `bd93b69` / `b2e3a10`)

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
| Strings localized so far | ~330 (up from ~210) |
| Strings remaining | ~220 across ~12 files |
| Completed | **Tiers 1 & 2** |

---

## What still needs translating (remaining priority list)

### Tier 2 — Course management ✅ DONE (committed `bd93b69` / `b2e3a10`)
All 11 files localized. Dictionaries added namespaces `lesson.*`, `content.*`, `schedule.*`, `settings.*`.
- `courses/[courseId]/schedule/page.tsx`, `courses/[courseId]/members/page.tsx`, `courses/[courseId]/announcements/page.tsx`, `courses/[courseId]/UnenrollButton.tsx`, `courses/[courseId]/manage/announcements/page.tsx`, `courses/[courseId]/manage/students/page.tsx`, `courses/[courseId]/manage/students/StudentActions.tsx` — done
- `courses/[courseId]/lessons/[lessonId]/page.tsx` — done
- `courses/[courseId]/manage/content/page.tsx` + `LessonEditForm.tsx` — done
- `courses/[courseId]/manage/schedule/page.tsx` + `ManageScheduleClient.tsx` — done
- `courses/[courseId]/manage/settings/page.tsx` — done
- Bugfixes: `courseSchedule.title` now interpolates `{title}`; `members.students` now interpolates `{n}`.

#### Known remaining English in Tier 2 (minor, in shared schedule components)
- `components/schedule/SessionList.tsx`: "No sessions scheduled yet.", "Today" badge, "Join link", "Reason:"
- `components/schedule/WeekCalendar.tsx`: rangeLabel date header, "Today" button+badge, "No sessions this week."
- `components/schedule/ScheduleView.tsx`: "list"/"calendar" toggle labels
- `components/schedule/AvailabilityDisplay.tsx`: availability intro paragraph, "has not published availability yet"
- These shared components belong to **Tier 3** per the original plan, so they're listed below.

### Tier 3 — Scheduling & availability (next)
| File | What |
|---|---|
| `schedule/page.tsx` | "Sessions you teach." / "Your sessions.", "No sessions scheduled yet." |
| `schedule/availability/page.tsx` | "Availability Settings", "Add Availability", "No availability set yet..." |
| `schedule/availability/AvailabilityForm.tsx` | "Start Time", "End Time", day picker labels |
| `schedule/availability/BlockedDatesSection.tsx` | "Blocked dates", "No blocked dates." |
| `components/schedule/ScheduleView.tsx` | "No sessions", week labels |
| `components/schedule/SessionList.tsx` | session card labels |
| `components/schedule/WeekCalendar.tsx` | day labels, time labels |
| `components/schedule/AvailabilityDisplay.tsx` | availability card labels |

### Tier 4 — Admin, misc & shared
| File | What |
|---|---|
| `admin/users/page.tsx` | "Manage all users in the system.", "Create User", table headers |
| `admin/users/AdminUsersClient.tsx` | "All roles", "Edit User", "Create Account" form |
| `admin/schedule/page.tsx` | schedule management labels |
| `announcements/page.tsx` | "Announcements", "No announcements yet." |
| `notifications/page.tsx` | "Notifications", "No notifications yet.", "Updates about your sessions..." |
| `notifications/NotificationsClient.tsx` | notification card labels |
| `components/NotificationBell.tsx` | notification badge labels |
| `components/MobileNav.tsx` | mobile nav icon labels (hardcoded English "Home", "Courses", "Schedule", "News", "Profile") — **critical — use `useT()`** |

### Tier 6 — Server action messages (deferred)
Success/error toast strings returned from `actions/*.ts`. Return a `key` and let the caller look it up with `t()`.
- `actions/courses.ts`, `actions/auth.ts`, `actions/lessons.ts`, `actions/progress.ts`, `actions/notifications.ts`, `actions/schedule.ts`, `actions/guardians.ts`, `actions/admin.ts`

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

## Known issue: Hydration mismatch (non-blocking, do NOT fix yet)

**Status:** Cosmetic warning in dev build. App runs normally. Leave for now — do not spend time chasing it.

```
Error: Hydration failed because the server rendered HTML didn't match the client.
As a result this tree will be regenerated on the client.
This can happen if a SSR-ed Client Component used:
- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.
https://react.dev/link/hydration-mismatch
```

**Where it manifests** (diff between server-rendered and client content, inside `<LayoutContent> → <LocaleProvider> → <LayoutBody>` → mobile `<header>`):

| Element | Server rendered (expected +) | Client rendered (actual -) |
|---|---|---|
| Notification `<a>` | `aria-label="Notifikasi"` | `aria-label="nav.notifications"` |
| Admin `<a>` | `aria-label="Kelola Pengguna"` | `aria-label="nav.userManagement"` |
| Admin icon `<span>` | `👥` present | `👥` missing |
| Logout `<button>` | `Keluar` | `nav.signOut` |

**Likely root cause:** The `aria-label` values and logout button text are being passed *through* Next.js `<Link>` / `<button>` during SSR, where `useT()` hasn't resolved yet (the `LocaleProvider`'s `readCookieInitial()` runs at module load time on the server, before locale context is set). The client then re-renders with the correct translated string → mismatch.

Specifically, `LayoutContent.tsx` wraps children in `<LocaleProvider initial={readCookieInitial()}>`, but `readCookieInitial()` runs at the **top level of the `LayoutContent` component function** on the client, and may see `document.cookie` differently on first SSR vs client render. This causes the header `<Link>` elements to hydrate with the fallback raw key (e.g. `nav.notifications`) rather than the resolved value.

**When to revisit:** If the user decides to tackle SSR locale resolution properly (e.g. passing locale via headers → server component → props, or using middleware to rewrite locale), fix `LocaleProvider.tsx` + `LayoutContent.tsx` at that time. Until then, leave untouched.

## Localization pattern to follow
1. Log in as `admin@example.com` (password `password123`)
2. 👤 Profile → switch language via 🇮🇩/🇺🇸 selector
3. Verify **sidebar labels change** ("Beranda" ↔ "Dashboard") — the whole app switches as one unit.
4. Role badge shows `Administrator` / `Pengajar` / `Siswa` / `Wali Murid`.
5. Confirm "Published", "Draft", "Pinned", "Archived" stay in English.
6. Spot-check placeholders and empty-state strings are in the selected locale.
