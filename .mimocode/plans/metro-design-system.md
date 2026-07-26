# Metro Design System — Full Implementation Plan

> Extending the metro-style design system (sharp corners, flat design, Microsoft palette) across the entire Piwulangan LMS.

---

## Global Color Mapping

All Tailwind color classes in existing files map to design tokens as follows:

| Current Class Pattern | Token Replacement | Usage |
|---|---|---|
| `bg-blue-600` | `bg-metro-primary` | Primary action buttons, nav active, links |
| `hover:bg-blue-700` | `hover:bg-metro-primary-hover` | Button/link hover |
| `bg-blue-50` / `border-blue-200` | `bg-metro-primary-light` / `border-metro-primary-border` | Active nav bg, pinned announcements |
| `text-blue-600` / `text-blue-700` | `text-metro-primary` | Links, active nav text |
| `bg-green-600` | `bg-metro-action` | Content/positive action buttons |
| `hover:bg-green-700` | `hover:bg-metro-action-hover` | Green button hover |
| `bg-red-600` / `bg-red-500` | `bg-metro-danger` | Delete, error badges |
| `hover:bg-red-700` | `hover:bg-metro-danger-hover` | Danger hover |
| `bg-yellow-600` | `bg-metro-warning` | Reset password, unpublish |
| `bg-purple-100 text-purple-700` | `bg-metro-role-admin` | Admin role badge |
| `bg-blue-100 text-blue-700` | `bg-metro-role-instructor` | Instructor role badge |
| `bg-green-100 text-green-700` | `bg-metro-role-student` | Student role badge |
| `bg-orange-100 text-orange-700` | `bg-metro-role-guardian` | Guardian role badge |
| `rounded-lg` / `rounded-md` | `metro-card` (no radius) | Cards, panels, modals |
| `rounded-full` | `rounded-full` (KEPT) | Badges, pills, avatars |
| `rounded-md` on buttons | `metro-btn-shape` (no radius) | Buttons only |

---

## Phase 1: Design Token Foundation

### 1A. CSS Variables in `src/app/globals.css`

```css
:root {
  /* === Metro Brand Colors (Microsoft Palette) === */
  --metro-blue:           #0078D4;
  --metro-blue-hover:     #106EBE;
  --metro-blue-light:     #E8F4FD;
  --metro-blue-border:    #B3D7F2;

  --metro-green:          #107C10;
  --metro-green-hover:    #0B5E0B;
  --metro-green-light:    #DFF6DD;

  --metro-red:            #D83B01;
  --metro-red-hover:      #A42601;
  --metro-red-light:      #FDE7E9;

  --metro-yellow:         #FFB900;
  --metro-yellow-hover:   #D89B00;
  --metro-yellow-light:   #FFF4CE;

  --metro-purple:         #8661C5;
  --metro-purple-light:   #EDE3F7;

  --metro-orange:         #D83B01;
  --metro-orange-light:   #FDE7E9;

  /* === Surface & Text === */
  --metro-bg:             #F3F2F1;
  --metro-surface:        #FFFFFF;
  --metro-border:         #EDEBE9;
  --metro-text:           #323130;
  --metro-text-secondary: #605E5C;
  --metro-text-muted:     #A19F9D;

  /* === Semantic Tokens === */
  --metro-primary:        var(--metro-blue);
  --metro-primary-hover:  var(--metro-blue-hover);
  --metro-primary-light:  var(--metro-blue-light);
  --metro-primary-border: var(--metro-blue-border);
  --metro-action:         var(--metro-green);
  --metro-action-hover:   var(--metro-green-hover);
  --metro-action-light:   var(--metro-green-light);
  --metro-danger:         var(--metro-red);
  --metro-danger-hover:   var(--metro-red-hover);
  --metro-danger-light:   var(--metro-red-light);
  --metro-warning:        var(--metro-yellow);
  --metro-warning-hover:  var(--metro-yellow-hover);
  --metro-warning-light:  var(--metro-yellow-light);

  /* === Spacing (keep default Tailwind scale) === */
  /* === Typography (keep default Tailwind scale) === */
}
```

### 1B. Extend Metro Utility Classes in `globals.css`

Replace the existing 3 metro classes and add the full set:

```css
@layer components {
  /* ---- Shapes ---- */
  .metro-card {
    border-radius: 0 !important;
  }

  /* ---- Buttons ---- */
  .metro-btn {
    @apply w-full py-3 text-base font-bold text-white transition-colors cursor-pointer;
    background-color: var(--metro-primary);
    border-radius: 0 !important;
  }
  .metro-btn:hover {
    background-color: var(--metro-primary-hover);
  }
  .metro-btn:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  .metro-btn-green {
    @apply w-full py-3 text-base font-bold text-white transition-colors cursor-pointer;
    background-color: var(--metro-action);
    border-radius: 0 !important;
  }
  .metro-btn-green:hover {
    background-color: var(--metro-action-hover);
  }
  .metro-btn-green:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  .metro-btn-danger {
    @apply w-full py-3 text-base font-bold text-white transition-colors cursor-pointer;
    background-color: var(--metro-danger);
    border-radius: 0 !important;
  }
  .metro-btn-danger:hover {
    background-color: var(--metro-danger-hover);
  }
  .metro-btn-danger:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  .metro-btn-outline {
    @apply w-full py-3 text-base font-bold text-metro-text border-2 border-metro-border bg-white transition-colors cursor-pointer;
    border-radius: 0 !important;
  }
  .metro-btn-outline:hover {
    @apply bg-metro-bg;
  }

  /* ---- Inputs ---- */
  .metro-input {
    @apply w-full border-2 border-metro-border bg-white px-4 py-3 text-metro-text placeholder-metro-text-muted transition-colors;
    border-radius: 0 !important;
    outline: none;
  }
  .metro-input:focus {
    border-color: var(--metro-primary);
    box-shadow: none;
  }

  /* ---- Alerts ---- */
  .metro-error {
    @apply px-4 py-3 text-sm font-medium text-white;
    background-color: var(--metro-danger);
    border-radius: 0 !important;
  }
  .metro-success {
    @apply px-4 py-3 text-sm font-medium text-white;
    background-color: var(--metro-action);
    border-radius: 0 !important;
  }

  /* ---- Page header accent bar (left blue stripe) ---- */
  .metro-header-bar {
    border-left: 4px solid var(--metro-primary);
  }

  /* ---- Sidebar nav item ---- */
  .metro-nav-item {
    @apply flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors;
    border-radius: 0 !important;
  }
  .metro-nav-item-active {
    @apply metro-nav-item;
    background-color: var(--metro-primary-light);
    color: var(--metro-primary);
  }
  .metro-nav-item-inactive {
    @apply metro-nav-item;
    color: var(--metro-text-secondary);
  }
  .metro-nav-item-inactive:hover {
    background-color: var(--metro-bg);
  }

  /* ---- Progress bar ---- */
  .metro-progress-track {
    @apply h-2 bg-metro-border;
    border-radius: 0 !important;
  }
  .metro-progress-fill {
    @apply h-2 bg-metro-primary;
    border-radius: 0 !important;
  }
  .metro-progress-fill-green {
    @apply h-2 bg-metro-action;
    border-radius: 0 !important;
  }
}
```

### 1C. Tailwind Config Changes (`tailwind.config.ts`)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Metro design tokens
        "metro-primary":         "var(--metro-primary)",
        "metro-primary-hover":   "var(--metro-primary-hover)",
        "metro-primary-light":   "var(--metro-primary-light)",
        "metro-primary-border":  "var(--metro-primary-border)",
        "metro-action":          "var(--metro-action)",
        "metro-action-hover":    "var(--metro-action-hover)",
        "metro-action-light":    "var(--metro-action-light)",
        "metro-danger":          "var(--metro-danger)",
        "metro-danger-hover":    "var(--metro-danger-hover)",
        "metro-danger-light":    "var(--metro-danger-light)",
        "metro-warning":         "var(--metro-warning)",
        "metro-warning-hover":   "var(--metro-warning-hover)",
        "metro-warning-light":   "var(--metro-warning-light)",
        "metro-text":            "var(--metro-text)",
        "metro-text-secondary":  "var(--metro-text-secondary)",
        "metro-text-muted":      "var(--metro-text-muted)",
        "metro-bg":              "var(--metro-bg)",
        "metro-surface":         "var(--metro-surface)",
        "metro-border":          "var(--metro-border)",
        // Role badges (keep as direct colors, no token — they're decorative)
        "metro-role-admin":      { light: "#EDE3F7", DEFAULT: "#8661C5" },
        "metro-role-instructor": { light: "#E8F4FD", DEFAULT: "#0078D4" },
        "metro-role-student":    { light: "#DFF6DD", DEFAULT: "#107C10" },
        "metro-role-guardian":   { light: "#FDE7E9", DEFAULT: "#D83B01" },
      },
      borderRadius: {
        "metro": "0",
      },
    },
  },
  plugins: [],
};
export default config;
```

### 1D. Files Changed in Phase 1
- `src/app/globals.css` — CSS variables + all metro utility classes
- `tailwind.config.ts` — color tokens registered

---

## Phase 2: Layout & Navigation

### 2A. Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

Changes:
- **Mobile header**: `bg-white` → `bg-metro-surface border-b-2 border-metro-border`. Title bar gets `bg-metro-primary text-white` strip.
- **Desktop sidebar**: `bg-white border-r` → `bg-metro-surface border-r-2 border-metro-border`. Header area gets `bg-metro-primary text-white`.
- **Nav links**: `rounded-lg` → `metro-nav-item` / `metro-nav-item-active` / `metro-nav-item-inactive` classes.
- **Active state**: `bg-blue-50 text-blue-700` → `metro-nav-item-active`.
- **User avatar**: `rounded-full bg-blue-600` → `rounded-full bg-metro-primary` (avatar stays rounded).
- **Sign Out button**: `rounded-md border` → `metro-btn-outline`.
- **Role badges**: `rounded-full` stays (badges are exempt).

Specific line changes:

| Line(s) | Current | New |
|---|---|---|
| 86 | `border-b bg-white` | `border-b-2 border-metro-border bg-metro-surface` |
| 87-88 | `text-lg font-bold text-gray-900` | `text-lg font-bold text-white` (header is blue strip) |
| 86 | `sticky top-0 z-40 ... bg-white` | Add `bg-metro-primary` to mobile header, white for user info section |
| 125-126 | `rounded-md border px-3 py-1.5 text-sm font-medium text-gray-600` | `metro-btn-outline w-auto px-3 py-1.5 text-sm` |
| 135 | `border-r bg-white` | `border-r-2 border-metro-border bg-metro-surface` |
| 136-137 | `p-4 border-b` + white bg | `p-4 bg-metro-primary text-white border-b-0` |
| 147-149 | `rounded-lg ... bg-blue-50 text-blue-700` | `metro-nav-item-active` |
| 147-149 | `rounded-lg ... text-gray-600 hover:bg-gray-100` | `metro-nav-item-inactive` |
| 168-169 | `rounded-full bg-blue-600` | `rounded-full bg-metro-primary` |
| 171-174 | `rounded-lg ... bg-purple-50 text-purple-700` | `metro-nav-item-active` (purple variant — keep purple for admin) |
| 185 | `p-4 border-t` | `p-4 border-t-2 border-metro-border` |

### 2B. MobileNav (`src/components/MobileNav.tsx`)

Changes:
- Container: `border-t bg-white` → `border-t-2 border-metro-border bg-metro-surface`
- Active tab: `text-blue-600` → `text-metro-primary`
- Inactive tab: `text-gray-500` → `text-metro-text-muted`
- Add `metro-card` class to container

### 2C. NotificationBell (`src/components/NotificationBell.tsx`)

Changes:
- Trigger button: `rounded-lg px-3 py-2 ... hover:bg-gray-100` → `metro-nav-item-inactive` (it's in the sidebar nav list)
- Dropdown panel: `rounded-lg border bg-white shadow-lg` → `metro-card border-2 border-metro-border bg-metro-surface shadow-lg`
- "Mark all read" link: `text-blue-600` → `text-metro-primary`
- Unread notification bg: `bg-blue-50` → `bg-metro-primary-light`
- "View all" link: `text-blue-600` → `text-metro-primary`

### 2D. Files Changed in Phase 2
- `src/app/(dashboard)/layout.tsx`
- `src/components/MobileNav.tsx`
- `src/components/NotificationBell.tsx`

---

## Phase 3: Auth Pages

### 3A. Login Page (`src/app/(auth)/login/page.tsx`)

Changes:
- Brand strip: `bg-[#0078D4]` → `bg-metro-primary`
- Form area: `bg-white` → `bg-metro-surface`
- Inputs already use `metro-input` — they'll automatically pick up new token values from Phase 1
- Buttons already use `metro-btn` — same
- Error banner already uses `metro-error` — same
- Link color: `text-[#0078D4]` → `text-metro-primary`
- Add `metro-card` class to any card wrappers

Specific line changes:

| Line | Current | New |
|---|---|---|
| 28 | `bg-[#0078D4]` | `bg-metro-primary` |
| 45 | `bg-white` | `bg-metro-surface` |
| 94 | `text-[#0078D4]` | `text-metro-primary` |

### 3B. Signup Page (`src/app/(auth)/signup/page.tsx`)

Same pattern as login:
- Line 28: `bg-[#0078D4]` → `bg-metro-primary`
- Line 45: `bg-white` → `bg-metro-surface`
- Line 64, 80, 99: `text-[#D83B01]` → `text-metro-danger`
- Line 118: `text-[#0078D4]` → `text-metro-primary`

### 3C. Files Changed in Phase 3
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`

---

## Phase 4: Dashboard Pages

### 4A. Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)

This is a server component with ~600 lines. Changes apply to all 4 role-specific dashboard components:

**Global changes (all roles):**
- Section headings: Keep as-is (text styling doesn't change)
- "View All" links: `text-blue-600 hover:text-blue-700` → `text-metro-primary hover:text-metro-primary-hover`

**StudentDashboard:**
| Pattern | Current | New |
|---|---|---|
| Session cards | `rounded-lg border bg-white p-4 hover:bg-gray-50` | `metro-card border-2 border-metro-border bg-metro-surface p-4 hover:bg-metro-bg` |
| Course cards | `rounded-lg border bg-white p-4 hover:shadow-md` | `metro-card border-2 border-metro-border bg-metro-surface p-4 hover:shadow-md` |
| Progress track | `rounded-full bg-gray-200` | `metro-progress-track` |
| Progress fill | `rounded-full bg-blue-600` | `metro-progress-fill` |
| "Continue" text | `text-blue-600` | `text-metro-primary` |
| "Completed" text | `text-green-600` | `text-metro-action` |
| Pinned announcement | `border-blue-200 bg-blue-50` | `border-metro-primary-border bg-metro-primary-light` |

**InstructorDashboard:**
| Pattern | Current | New |
|---|---|---|
| Session cards | Same as student session cards | Same transformation |
| Stats cards | `rounded-lg border bg-white p-4` | `metro-card border-2 border-metro-border bg-metro-surface p-4` |
| Course cards | Same as student course cards | Same transformation |
| "View" links | `text-blue-600` | `text-metro-primary` |

**GuardianDashboard:**
- Same card/progress bar transformations as StudentDashboard
- Progress bars for guardians: `bg-blue-600` → `metro-progress-fill`
- Student name tags: `bg-purple-100 text-purple-700 rounded-full` → keep `rounded-full` (badge exemption)

**AdminDashboard:**
| Pattern | Current | New |
|---|---|---|
| Stats cards | `rounded-lg border bg-white p-4` | `metro-card border-2 border-metro-border bg-metro-surface p-4` |
| Quick link cards | `rounded-lg border bg-white p-6 hover:shadow-md` | `metro-card border-2 border-metro-border bg-metro-surface p-6 hover:shadow-md` |

### 4B. Profile Page (`src/app/(dashboard)/profile/page.tsx`)

| Line | Current | New |
|---|---|---|
| 14 | `rounded-lg border bg-white p-6` | `metro-card border-2 border-metro-border bg-metro-surface p-6` |
| 28 | `rounded-full bg-blue-100 px-3 py-1` | `rounded-full bg-metro-primary-light px-3 py-1 text-metro-primary` |

### 4C. Notifications Page

Files: `src/app/(dashboard)/notifications/page.tsx`, `NotificationsClient.tsx`
- Card containers: `rounded-lg` → `metro-card`
- Unread highlight: `bg-blue-50` → `bg-metro-primary-light`
- Links: `text-blue-600` → `text-metro-primary`

### 4D. Announcements Page (`src/app/(dashboard)/announcements/page.tsx`)

| Pattern | Current | New |
|---|---|---|
| Announcement cards | `rounded-lg border bg-white p-4` | `metro-card border-2 border-metro-border bg-metro-surface p-4` |
| Pinned state | `border-blue-200 bg-blue-50` | `border-metro-primary-border bg-metro-primary-light` |
| Pinned icon color | `text-blue-600` | `text-metro-primary` |
| Course link hover | `hover:text-blue-600` | `hover:text-metro-primary` |
| "Manage" link | `hover:text-blue-600` | `hover:text-metro-primary` |

### 4E. Files Changed in Phase 4
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/profile/page.tsx`
- `src/app/(dashboard)/notifications/page.tsx`
- `src/app/(dashboard)/notifications/NotificationsClient.tsx` (if it exists separately)
- `src/app/(dashboard)/announcements/page.tsx`

---

## Phase 5: Course Pages

### 5A. Course List Page (`src/app/(dashboard)/courses/page.tsx`)

| Line | Current | New |
|---|---|---|
| 137 | `rounded-md bg-blue-600 px-4 py-2` | `bg-metro-primary px-4 py-2 text-sm font-medium text-white hover:bg-metro-primary-hover metro-card` |

### 5B. CoursesClient (`src/app/(dashboard)/courses/CoursesClient.tsx`)

| Pattern | Current | New |
|---|---|---|
| Course cards | `rounded-lg border bg-white p-4 hover:shadow-md` | `metro-card border-2 border-metro-border bg-metro-surface p-4 hover:shadow-md` |
| Status badges | `rounded-full bg-yellow-100 ...` / `rounded-full bg-gray-100 ...` | Keep `rounded-full` (badge exemption) |
| Progress track | `rounded-full bg-gray-200` | `metro-progress-track` |
| Progress fill | `rounded-full bg-blue-600` | `metro-progress-fill` |
| "Show Archived" toggle | `text-blue-600` | `text-metro-primary` |
| Archive/unarchive buttons | `text-green-600` / `text-gray-600` | `text-metro-action` / `text-metro-text-secondary` |
| Message banner | `rounded-lg p-4` | `metro-card p-4` |

### 5C. BrowseCourses (`src/app/(dashboard)/courses/BrowseCourses.tsx`)

Same card/button transformations as CoursesClient.

### 5D. New Course Page (`src/app/(dashboard)/courses/new/page.tsx`)

| Line | Current | New |
|---|---|---|
| 47, 62, 75, 87 | `rounded-md border border-gray-300 ... focus:border-blue-500 focus:ring-1 focus:ring-blue-500` | `metro-input` (or apply metro-card + border-2 pattern) |
| 98 | `rounded-md bg-blue-600 ... focus:ring-2 focus:ring-blue-500` | `metro-btn` (remove focus ring) |
| 49 | `text-red-600` | `text-metro-danger` |

### 5E. Course Detail Page (`src/app/(dashboard)/courses/[courseId]/page.tsx`)

| Pattern | Current | New |
|---|---|---|
| Next session box | `rounded-lg border border-blue-200 bg-blue-50 p-4` | `metro-card border-2 border-metro-primary-border bg-metro-primary-light p-4` |
| Guardian progress panel | `rounded-lg border bg-white p-4` | `metro-card border-2 border-metro-border bg-metro-surface p-4` |
| Guardian progress fill | `bg-purple-600 rounded-full` | Keep `rounded-full`, color → `bg-metro-role-admin` |
| Student progress track | `rounded-full bg-gray-200` | `metro-progress-track` |
| Student progress fill | `rounded-full bg-blue-600` | `metro-progress-fill` |
| Enroll Now button | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Join button | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Invite code input | `rounded-md border ...` | `metro-input w-auto` |
| Module containers | `rounded-lg border bg-white` | `metro-card border-2 border-metro-border bg-metro-surface` |
| Announcement cards | `rounded-lg border bg-white p-3` | `metro-card border-2 border-metro-border bg-metro-surface p-3` |
| Draft badge | `rounded-full bg-yellow-100` | Keep `rounded-full` |
| Action links (Schedule, Settings) | `rounded-md border px-3 py-2 text-sm text-gray-600` | `metro-btn-outline w-auto px-3 py-2 text-sm` |
| "Continue" / "View schedule" links | `text-blue-600` | `text-metro-primary` |
| Preview card | `rounded-lg border bg-white p-6 text-center` | `metro-card border-2 border-metro-border bg-metro-surface p-6 text-center` |

### 5F. Manage Content Page (`courses/[courseId]/manage/content/page.tsx`)

| Pattern | Current | New |
|---|---|---|
| Module containers | `rounded-lg border bg-white` | `metro-card border-2 border-metro-border bg-metro-surface` |
| Module title bar | `border-b px-4 py-3` | `border-b-2 border-metro-border px-4 py-3` |
| Add module input | `rounded-md border border-gray-300 ...` | `metro-input w-auto flex-1` |
| Add module button | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Lesson add input | `rounded-md border border-gray-300 ...` | `metro-input w-auto flex-1` |
| "+ Lesson" button | `rounded-md bg-gray-100 ...` | `metro-btn-outline w-auto` |
| Delete button | `text-red-500` | `text-metro-danger` |

### 5G. LessonEditForm (`courses/[courseId]/manage/content/LessonEditForm.tsx`)

- All inputs: `rounded-md border ...` → `metro-input` (small variant or inline)
- Save/delete buttons: apply metro-btn / metro-btn-danger patterns

### 5H. Manage Settings Page (`courses/[courseId]/manage/settings/page.tsx`)

| Pattern | Current | New |
|---|---|---|
| Settings card | `rounded-lg border bg-white p-6` | `metro-card border-2 border-metro-border bg-metro-surface p-6` |
| All form inputs | `rounded-md border border-gray-300 ...` | `metro-input` |
| Save button | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Publish button | `rounded-md bg-green-600 ...` | `metro-btn-green w-auto` |
| Unpublish button | `rounded-md bg-yellow-600 ...` | `bg-metro-warning ... metro-card` |
| Archive button | `rounded-md bg-gray-600 ...` | `metro-btn-outline w-auto` |
| Danger zone | `rounded-lg border border-red-200 bg-red-50 p-6` | `metro-card border-2 border-metro-danger-border bg-metro-danger-light p-6` |
| Delete button | `rounded-md bg-red-600 ...` | `metro-btn-danger w-auto` |
| Invite code section | `rounded-lg border bg-white p-6` | `metro-card border-2 border-metro-border bg-metro-surface p-6` |

### 5I. Manage Students Page (`courses/[courseId]/manage/students/page.tsx`)

| Pattern | Current | New |
|---|---|---|
| Add student panel | `rounded-lg border bg-white p-4` | `metro-card border-2 border-metro-border bg-metro-surface p-4` |
| Table container | `rounded-lg border bg-white overflow-x-auto` | `metro-card border-2 border-metro-border bg-metro-surface overflow-x-auto` |
| Table header | `bg-gray-50 border-b` | `bg-metro-bg border-b-2 border-metro-border` |
| Progress bar | `rounded-full bg-gray-200` / `bg-blue-600` | `metro-progress-track` / `metro-progress-fill` |

### 5J. Other Course Sub-Pages

Apply same patterns to:
- `courses/[courseId]/manage/students/StudentActions.tsx` — buttons/inputs
- `courses/[courseId]/manage/schedule/ManageScheduleClient.tsx` — cards, buttons
- `courses/[courseId]/manage/schedule/page.tsx` — layout
- `courses/[courseId]/manage/announcements/page.tsx` — cards
- `courses/[courseId]/schedule/page.tsx` — schedule view
- `courses/[courseId]/lessons/[lessonId]/page.tsx` — lesson view
- `courses/[courseId]/announcements/page.tsx` — announcement cards
- `courses/[courseId]/members/page.tsx` — member list
- `courses/[courseId]/UnenrollButton.tsx` — danger button

### 5K. Files Changed in Phase 5
- `src/app/(dashboard)/courses/page.tsx`
- `src/app/(dashboard)/courses/CoursesClient.tsx`
- `src/app/(dashboard)/courses/BrowseCourses.tsx`
- `src/app/(dashboard)/courses/new/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/content/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/content/LessonEditForm.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/settings/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/students/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/students/StudentActions.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/schedule/ManageScheduleClient.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/schedule/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/manage/announcements/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/schedule/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/announcements/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/members/page.tsx`
- `src/app/(dashboard)/courses/[courseId]/UnenrollButton.tsx`

---

## Phase 6: Schedule Components

### 6A. Schedule Page (`src/app/(dashboard)/schedule/page.tsx`)

- Page titles/links: `text-blue-600` → `text-metro-primary`
- Guardian student tags: `bg-purple-100 text-purple-700 px-3 py-1 rounded-full` → keep `rounded-full`, use `bg-metro-role-admin-light text-metro-role-admin`

### 6B. Shared ScheduleView Component

Check `src/components/schedule/ScheduleView.tsx` and `src/components/schedule/types.ts`:
- Session cards: `rounded-lg` → `metro-card border-2 border-metro-border`
- Status indicators: update to metro tokens
- Time blocks: no radius, flat borders

### 6C. Availability Pages
- `src/app/(dashboard)/schedule/availability/page.tsx`
- `src/app/(dashboard)/schedule/availability/AvailabilityForm.tsx`
- `src/app/(dashboard)/schedule/availability/BlockedDatesSection.tsx`

Apply: `rounded-md` inputs → `metro-input`, buttons → `metro-btn`/`metro-btn-outline`, cards → `metro-card`.

### 6D. Files Changed in Phase 6
- `src/app/(dashboard)/schedule/page.tsx`
- `src/components/schedule/ScheduleView.tsx` (if exists)
- `src/components/schedule/types.ts` (if styling exists)
- `src/app/(dashboard)/schedule/availability/page.tsx`
- `src/app/(dashboard)/schedule/availability/AvailabilityForm.tsx`
- `src/app/(dashboard)/schedule/availability/BlockedDatesSection.tsx`

---

## Phase 7: Admin Pages

### 7A. Admin Users Page (`src/app/(dashboard)/admin/users/page.tsx` + `AdminUsersClient.tsx`)

| Pattern | Current | New |
|---|---|---|
| Search input | `rounded-md border ... focus:border-blue-500 focus:ring-1` | `metro-input w-auto` |
| Role filter select | `rounded-md border ...` | `metro-input w-auto` |
| Create User button | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Users table wrapper | `rounded-lg border bg-white overflow-x-auto` | `metro-card border-2 border-metro-border bg-metro-surface overflow-x-auto` |
| Table header row | `bg-gray-50` | `bg-metro-bg` |
| Table body rows | `divide-y divide-gray-200` | `divide-y divide-metro-border` |
| Inactive row | `bg-gray-50` | `bg-metro-bg` |
| Role badges | `rounded-full bg-purple-100` etc. | Keep `rounded-full` (badge exemption) |
| Status badges | `rounded-full bg-green-100` / `bg-red-100` | Keep `rounded-full` |
| Edit link | `text-blue-600` | `text-metro-primary` |
| Reset Password link | `text-yellow-600` | `text-metro-warning` |
| Link button | `text-purple-600` | `text-metro-role-admin` |
| Deactivate | `text-red-600` | `text-metro-danger` |
| Activate | `text-green-600` | `text-metro-action` |
| **Modals (all 4):** | | |
| Modal overlay | `bg-black bg-opacity-50` | Keep (standard) |
| Modal container | `bg-white rounded-lg p-6` | `bg-metro-surface metro-card p-6` |
| Modal inputs | `rounded-md border ... focus:ring-1` | `metro-input` |
| Cancel button | `rounded-md border border-gray-300 ...` | `metro-btn-outline w-auto` |
| Submit button (create) | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Submit button (save) | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Submit button (reset) | `rounded-md bg-yellow-600 ...` | `bg-metro-warning ... metro-card w-auto` |
| Submit button (link) | `rounded-md bg-blue-600 ...` | `metro-btn w-auto` |
| Close button | `rounded-md border ...` | `metro-btn-outline w-auto` |
| Message banner | `rounded-lg p-4` | `metro-card p-4` |
| Linked user row | `bg-gray-50 rounded-lg p-2` | `bg-metro-bg metro-card p-2` |
| Remove button | `text-red-600` | `text-metro-danger` |

### 7B. Admin Schedule Page (`src/app/(dashboard)/admin/schedule/page.tsx`)

Apply same card/button transformations as schedule pages.

### 7C. Files Changed in Phase 7
- `src/app/(dashboard)/admin/users/page.tsx`
- `src/app/(dashboard)/admin/users/AdminUsersClient.tsx`
- `src/app/(dashboard)/admin/schedule/page.tsx`

---

## Implementation Order & Dependencies

```
Phase 1 (Foundation)
  ↓
Phase 2 (Layout/Nav) ← depends on Phase 1 tokens
  ↓
Phase 3 (Auth) ← depends on Phase 1 tokens
  ↓
Phase 4 (Dashboard) ← depends on Phase 2 layout
  ↓
Phase 5 (Courses) ← largest phase, ~18 files
  ↓
Phase 6 (Schedule) ← depends on shared components
  ↓
Phase 7 (Admin) ← depends on Phase 2 layout
```

Phases 3, 4, 6, 7 can be done in parallel after Phases 1-2 are complete. Phase 5 is the largest and should be done methodically.

---

## Complete File List (33 files)

### Foundation (2)
1. `src/app/globals.css`
2. `tailwind.config.ts`

### Layout & Nav (3)
3. `src/app/(dashboard)/layout.tsx`
4. `src/components/MobileNav.tsx`
5. `src/components/NotificationBell.tsx`

### Auth (2)
6. `src/app/(auth)/login/page.tsx`
7. `src/app/(auth)/signup/page.tsx`

### Dashboard (5)
8. `src/app/(dashboard)/dashboard/page.tsx`
9. `src/app/(dashboard)/profile/page.tsx`
10. `src/app/(dashboard)/notifications/page.tsx`
11. `src/app/(dashboard)/notifications/NotificationsClient.tsx`
12. `src/app/(dashboard)/announcements/page.tsx`

### Courses (18)
13. `src/app/(dashboard)/courses/page.tsx`
14. `src/app/(dashboard)/courses/CoursesClient.tsx`
15. `src/app/(dashboard)/courses/BrowseCourses.tsx`
16. `src/app/(dashboard)/courses/new/page.tsx`
17. `src/app/(dashboard)/courses/[courseId]/page.tsx`
18. `src/app/(dashboard)/courses/[courseId]/manage/content/page.tsx`
19. `src/app/(dashboard)/courses/[courseId]/manage/content/LessonEditForm.tsx`
20. `src/app/(dashboard)/courses/[courseId]/manage/settings/page.tsx`
21. `src/app/(dashboard)/courses/[courseId]/manage/students/page.tsx`
22. `src/app/(dashboard)/courses/[courseId]/manage/students/StudentActions.tsx`
23. `src/app/(dashboard)/courses/[courseId]/manage/schedule/ManageScheduleClient.tsx`
24. `src/app/(dashboard)/courses/[courseId]/manage/schedule/page.tsx`
25. `src/app/(dashboard)/courses/[courseId]/manage/announcements/page.tsx`
26. `src/app/(dashboard)/courses/[courseId]/schedule/page.tsx`
27. `src/app/(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx`
28. `src/app/(dashboard)/courses/[courseId]/announcements/page.tsx`
29. `src/app/(dashboard)/courses/[courseId]/members/page.tsx`
30. `src/app/(dashboard)/courses/[courseId]/UnenrollButton.tsx`

### Schedule (4-6)
31. `src/app/(dashboard)/schedule/page.tsx`
32. `src/app/(dashboard)/schedule/availability/page.tsx`
33. `src/app/(dashboard)/schedule/availability/AvailabilityForm.tsx`
34. `src/app/(dashboard)/schedule/availability/BlockedDatesSection.tsx`
35. `src/components/schedule/ScheduleView.tsx` (if exists)

### Admin (3)
36. `src/app/(dashboard)/admin/users/page.tsx`
37. `src/app/(dashboard)/admin/users/AdminUsersClient.tsx`
38. `src/app/(dashboard)/admin/schedule/page.tsx`

---

## Quick Reference: Search & Replace Cheat Sheet

For mechanical find-replace across all files:

```bash
# Color replacements (in className strings)
bg-[#0078D4]           → bg-metro-primary
bg-[#D83B01]           → bg-metro-danger
text-[#0078D4]         → text-metro-primary
text-[#D83B01]         → text-metro-danger

# Rounded corners on cards/panels (NOT badges)
rounded-lg border bg-white  → metro-card border-2 border-metro-border bg-metro-surface
rounded-md bg-blue-600      → metro-btn (or bg-metro-primary metro-card)

# Progress bars
rounded-full bg-gray-200    → metro-progress-track
rounded-full bg-blue-600    → metro-progress-fill

# Nav items
rounded-lg ... bg-blue-50 text-blue-700   → metro-nav-item-active
rounded-lg ... text-gray-600 hover:bg-gray-100  → metro-nav-item-inactive

# Borders
border-b                  → border-b-2 border-metro-border
border-r                  → border-r-2 border-metro-border
border-t                  → border-t-2 border-metro-border
border (standalone)       → border-2 border-metro-border
```

**DO NOT replace:**
- `rounded-full` on badges/pills/avatars (keep as-is)
- `bg-black bg-opacity-50` on modal overlays (keep as-is)
- Any color used purely for role badges (keep role-specific colors as decorative)
