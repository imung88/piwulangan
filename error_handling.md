# Comprehensive Error Handling Strategy & Implementation Plan

## 1. Executive Summary
This document establishes the official error handling strategy for the **Piwulangan** project. Currently, server actions mix thrown `Error` instances with returned `{ error: ... }` objects. This plan outlines a clean, production-grade pattern separating **Operational Errors** (business logic / user input validation) from **System Faults** (infrastructure / unhandled crashes).

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
