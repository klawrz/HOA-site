import { Role } from "@/generated/prisma"

// The Account Holder can automatically preview any role's screens - per
// Dara, 2026-08-27: "the account holder needs automatically to be able to
// see as if they held whatever role they wish... special for the account
// holder only." Deliberately navigation/preview ONLY - server actions'
// own permission checks (canManageReserveFund, isBoardMemberOnly, etc.)
// must keep checking the REAL role/isBoardMember flag directly, never this
// helper, so the handful of actions deliberately walled off even from
// Account Owner (a PM can't approve its own contract, ownership transfer
// is Board-only) stay genuinely walled off. This only ever gates whether a
// page renders, nothing more.
export function canPreviewRole(sessionRole: Role | null | undefined, requiredRole: Role): boolean {
  return sessionRole === requiredRole || sessionRole === "ACCOUNT_OWNER"
}

// Where each role lands after login / when previewing that role - shared so
// the header's "View as" menu and the plain /dashboard router agree.
export const ROLE_HOME: Record<Role, string> = {
  ACCOUNT_OWNER: "/dashboard/account",
  OWNER: "/dashboard/owner",
  RENTER: "/dashboard/renter",
  PROPERTY_MANAGER: "/dashboard/property-manager",
  CONTRACTOR: "/dashboard/contractor",
  BOARD_MEMBER: "/dashboard/board",
  UNIT_MANAGER: "/dashboard/unit-manager",
}

// Inverse of ROLE_HOME, longest-prefix-first so e.g. a Board Member who's
// also previewed as Owner under /dashboard/owner/governance/board/* still
// resolves to OWNER (the more specific /dashboard/board prefix doesn't
// appear in that URL at all, so no ambiguity there in practice).
const HOME_PREFIXES = (Object.entries(ROLE_HOME) as [Role, string][]).sort((a, b) => b[1].length - a[1].length)

// Which role's chrome (sidebar/header) a given URL belongs to - used ONLY
// so the Account Owner's "View as" preview shows the right nav/badge for
// wherever they've navigated to, since Sidebar/Header are client
// components that don't otherwise know why a page rendered. Falls back to
// the person's real role when the path doesn't match any other role's
// section (i.e. everyone else, all the time, and the Account Owner on
// their own /dashboard/account pages).
export function roleForPathname(pathname: string, realRole: Role): Role {
  if (realRole !== "ACCOUNT_OWNER") return realRole
  for (const [role, prefix] of HOME_PREFIXES) {
    if (role !== "ACCOUNT_OWNER" && (pathname === prefix || pathname.startsWith(prefix + "/"))) return role
  }
  return realRole
}
