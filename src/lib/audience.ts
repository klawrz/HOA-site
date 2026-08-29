import type { Role } from "@/generated/prisma"

// Shared audience-targeting helper for Announcements and CustomKeyDate -
// both store the same lightweight comma-separated-string encoding (see the
// schema comment on Announcement.visibleRoles). null/empty means "everyone
// in the org," which is the original, only behavior before targeting
// existed - so anything created before this feature stays visible to all,
// with no backfill needed.
export const AUDIENCE_ROLES: Role[] = [
  "OWNER",
  "RENTER",
  "CONTRACTOR",
  "UNIT_MANAGER",
  "BOARD_MEMBER",
  "PROPERTY_MANAGER",
  "ACCOUNT_OWNER",
]

export const audienceRoleLabel: Record<Role, string> = {
  OWNER: "Owners",
  RENTER: "Renters",
  CONTRACTOR: "Contractors",
  UNIT_MANAGER: "Unit Managers",
  BOARD_MEMBER: "Board Members",
  PROPERTY_MANAGER: "Property Manager",
  ACCOUNT_OWNER: "Account Holder",
}

// null return = visible to everyone (not "visible to nobody" - an empty
// selection in the UI is treated as "All members", not an empty audience).
export function parseVisibleRoles(raw: string | null): Role[] | null {
  if (!raw || !raw.trim()) return null
  const roles = raw.split(",").map((s) => s.trim()).filter(Boolean) as Role[]
  return roles.length > 0 ? roles : null
}

export function serializeVisibleRoles(roles: Role[] | null | undefined): string | null {
  if (!roles || roles.length === 0) return null
  return roles.join(",")
}

// viewerRoles is a list, not a single role, so a person holding more than
// one real capacity (e.g. Owner who's also a Board Member) sees anything
// targeted at either - matches how the rest of the app already treats
// isBoardMember as an addition on top of a primary role, not a swap.
export function isVisibleToRoles(visibleRoles: string | null, viewerRoles: Role[]): boolean {
  const targets = parseVisibleRoles(visibleRoles)
  if (!targets) return true
  return viewerRoles.some((r) => targets.includes(r))
}

// Shared "hasn't expired" clause for every Announcement list query - one
// with no removeAfter set never expires (the original, only behavior);
// one that's past its removeAfter is filtered out everywhere, including
// the poster's own management view, rather than kept around and just
// visually muted. Not deleted outright, so it's still recoverable in the
// database if ever needed. Lives here (not in the "use server" actions
// file) since it's a plain sync helper, not a server action - every export
// from a "use server" file must be async.
export function notExpiredAnnouncement() {
  return { OR: [{ removeAfter: null }, { removeAfter: { gte: new Date() } }] }
}

// The Owner-facing feed's extra clause on top of notExpiredAnnouncement() -
// a scheduled-for-the-future announcement (postOn set, not yet reached)
// stays invisible to the audience until it actually goes live. NOT applied
// to the poster's own management view - Board/PM need to see (and edit)
// what they've scheduled before it's live, so that view only ever applies
// notExpiredAnnouncement(), never this.
export function isLiveAnnouncement() {
  return { OR: [{ postOn: null }, { postOn: { lte: new Date() } }] }
}
