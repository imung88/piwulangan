// Single source of truth for identifying the environment-controlled superadmin.
// The superadmin's identity is provisioned from SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD
// on every login (see src/lib/auth.ts) and must not be mutable from the app.

export const SUPERADMIN_ID = "superadmin";

// The superadmin's display name is fixed and provisioned on login (src/lib/auth.ts).
// It is reserved so no other account can adopt it.
export const SUPERADMIN_NAME = "superadmin";

export function isSuperadminId(id: string | null | undefined): boolean {
  return id === SUPERADMIN_ID;
}

export function isReservedSuperadminName(name: string | null | undefined): boolean {
  return !!name && name.trim().toLowerCase() === SUPERADMIN_NAME;
}

// Server-only: reads SUPERADMIN_EMAIL from the environment.
export function isSuperadminEmail(email: string | null | undefined): boolean {
  const env = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  return !!env && !!email && email.trim().toLowerCase() === env;
}
