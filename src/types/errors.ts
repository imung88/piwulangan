/**
 * Shared result type for all server actions.
 *
 * Every server action returns an `ActionResult<T>` — never throws for expected
 * (operational) failures:
 *
 *   - Validation / auth / authorization / "not found" problems → return
 *     `{ success: false, error, fieldErrors? }` with a localized message.
 *   - System faults (DB down, unexpected crashes) → still throw, so they
 *     bubble up to the route-level error boundary.
 *
 * Success payloads always live under `data` — never as loose sibling fields.
 * `data` is required on success unless `T` is `void`, so callers can destructure
 * it freely after a `if (!result.success) return result;` guard. See
 * error_handling.md for the full strategy.
 */
export type FieldErrors = Record<string, string[]>;

export type ActionResult<T = void> =
  | (T extends void
      ? { success: true }
      : { success: true; data: T })
  | { success: false; error: string; fieldErrors?: FieldErrors };
