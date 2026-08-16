# Comprehensive Error Handling Strategy & Implementation Plan

## 1. Executive Summary
This document establishes the official error handling strategy for the **Piwulangan** project. Server actions return a typed `ActionResult` discriminated union — operational errors are **returned**, system faults are **thrown** to Next.js error boundaries. See **Status** below for what is already implemented (2026-08-17).

### Status (2026-08-17): IMPLEMENTED
- **Phase 1 — Done.** `src/types/errors.ts` defines `ActionResult<T>` (with a conditional type so `data` is required exactly when `T` is not `void`) plus `ok()`/`fail()`/`getFieldErrors()` helpers.
- **Phase 2 — Done.** All 11 files in `src/actions/` return `ActionResult`; zero `throw new Error` remain for operational errors. Auth/authz guards are centralized in `src/lib/authHelpers.ts` (`requireUser` / `requireRole` / `requireCourseManager` / `requireCourseOwner`), returning localized `errors.unauthenticated` / `errors.unauthorized` / `errors.courseNotFound`. Success payloads are nested under `data`; the loose per-file `ActionResult` types in `schedule.ts`/`reports.ts` are gone.
- **Phase 3 — Done.** All client consumers use the uniform `if (!res.success) { ... res.error / fieldErrors }` pattern. No `typeof res.error === "string"` dances, no `"error" in res` checks, no `try/catch` around actions. Supporting work: `src/types/next-auth.d.ts` augments `Session.user` with typed `id`/`role`, removing ~90 `(session.user as any)` casts across pages, actions, and middleware.
- **Phase 4 — Done.** `src/app/(dashboard)/error.tsx` catches system faults with a localized message + retry button.
- **Remaining:** none for the core plan. Future actions should copy the pattern from any converted file (e.g. `src/actions/courses.ts`) and add any new `errors.*` keys to both locales (`src/lib/i18n/locales/en.ts` and `id.ts`).

---

## 2. Error Taxonomy

### A. Operational Errors (Expected, Recoverable)
- **Validation Errors:** Invalid user input, malformed payloads (handled via Zod).
- **Authentication/Authorization Errors:** Unauthenticated sessions, insufficient role permissions (`INSTRUCTOR`, `ADMIN`).
- **Domain Logic Errors:** Course not found, scheduling conflicts (e.g., date in past, overlapping bookings).
- *Handling Strategy:* Return structured, typed result objects containing localized error messages or field errors. **Do not throw exceptions for operational errors.**

### B. System Faults (Unexpected, Unrecoverable)
- Database connection failure (Turso/SQLite unreachable).
- Uncaught runtime exceptions or memory corruption.
- *Handling Strategy:* Throw standard `Error` instances (or custom AppError subclasses) so they bubble up to Next.js Error Boundaries (`error.tsx`, `global-error.tsx`).

---

## 3. Standardized Result Pattern (`ActionResult`)

For all Server Actions, enforce a consistent discriminated union return type:

```ts
export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = void> = 
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: FieldErrors };
```

### Example Usage in Server Actions (`src/actions/courses.ts`):
```ts
'use server';

import { ActionResult } from '@/types/errors';
import { db } from '@/lib/db';
import { getServerT } from '@/lib/i18n/serverT';

export async function createCourse(formData: FormData): Promise<ActionResult<{ courseId: string }>> {
  const t = await getServerT();
  const session = await auth();

  // 1. Authentication check
  if (!session?.user) {
    return { success: false, error: t("errors.unauthenticated") };
  }

  // 2. Authorization check
  if (session.user.role !== 'ADMIN' && session.user.role !== 'INSTRUCTOR') {
    return { success: false, error: t("errors.unauthorized") };
  }

  // 3. Validation
  const parsed = courseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { 
      success: false, 
      error: t("errors.validationFailed"),
      fieldErrors: parsed.error.flatten().fieldErrors 
    };
  }

  try {
    const course = await db.course.create({ data: parsed.data });
    return { success: true, data: { courseId: course.id } };
  } catch (err) {
    // Log system error internally, return friendly message to client
    console.error("Failed to create course:", err);
    return { success: false, error: t("errors.databaseError") };
  }
}
```

---

## 4. Client-Side Error Consumption

Client components and forms consuming server actions should handle the standardized `ActionResult`:

```tsx
const result = await createCourse(formData);

if (!result.success) {
  if (result.fieldErrors) {
    setFieldErrors(result.fieldErrors);
  } else {
    toast.error(result.error);
  }
  return;
}

toast.success("Course created successfully!");
router.push(`/courses/${result.data.courseId}`);
```

---

## 5. Migration Roadmap

1. **Phase 1: Type Definition & Helpers**
   - Create `piwulangan/src/types/errors.ts` defining `ActionResult<T>` and standard error response builders.
2. **Phase 2: Server Action Refactoring**
   - Refactor `src/actions/` modules (`courses.ts`, `schedule.ts`, `lessons.ts`, `reports.ts`, `profile.ts`) to return `ActionResult` consistently instead of throwing operational errors.
3. **Phase 3: Component Integration**
   - Update form handlers and client components to ingest `fieldErrors` and action-level `error` messages cleanly.
4. **Phase 4: Error Boundaries & Monitoring**
   - Ensure `src/app/(dashboard)/error.tsx` properly catches unhandled system faults and provides a friendly fallback UI with a retry action.
