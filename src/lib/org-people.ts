import { db } from "@/lib/db"
import { Role } from "@/generated/prisma"

export interface OrgPerson {
  userId: string
  name: string | null
  email: string
  hasPortalAccess: boolean
  membershipRole: Role | null
  unitNumbers: string[]
  boardTitles: string[]
}

// "Members" means everyone with a real stake in the HOA - not just accounts
// that have logged into HOPE. A unit owner or Board seat holder recorded
// directly (see assignUnitOwner in actions/org.ts and resolveHolder in
// actions/board-positions.ts) is a member of the community whether or not
// they've accepted a portal invite yet. Dedups by user - the same person
// can be a unit owner, hold a Board seat, and have portal access all at
// once, and should appear once with all three reflected.
export async function getOrgPeople(orgId: string): Promise<OrgPerson[]> {
  // Fetch every membership, including ACCOUNT_OWNER - needed so an Account
  // Owner who also holds a unit or Board seat is correctly marked as
  // having portal access instead of falsely showing "Not on portal".
  // Plain Account Owners (already shown separately on the account
  // dashboard) are filtered back out below.
  const [memberships, ownerships, boardPositions] = await Promise.all([
    db.membership.findMany({ where: { orgId }, include: { user: true } }),
    db.unitOwnership.findMany({
      where: { isCurrent: true, unit: { orgId } },
      include: { owner: true, unit: { select: { number: true } } },
    }),
    db.boardPosition.findMany({ where: { orgId, userId: { not: null } }, include: { user: true } }),
  ])

  const people = new Map<string, OrgPerson>()
  function ensure(user: { id: string; name: string | null; email: string }) {
    let p = people.get(user.id)
    if (!p) {
      p = {
        userId: user.id,
        name: user.name,
        email: user.email,
        hasPortalAccess: false,
        membershipRole: null,
        unitNumbers: [],
        boardTitles: [],
      }
      people.set(user.id, p)
    }
    return p
  }

  for (const m of memberships) {
    const p = ensure(m.user)
    p.hasPortalAccess = true
    p.membershipRole = m.role
  }
  for (const o of ownerships) {
    ensure(o.owner).unitNumbers.push(o.unit.number)
  }
  for (const bp of boardPositions) {
    if (!bp.user) continue
    ensure(bp.user).boardTitles.push(bp.title)
  }

  // Drop plain Account Owners - they're shown separately, elsewhere. One
  // who also owns a unit or holds a Board seat stays, since that's real
  // information about them beyond just "Account Owner".
  return Array.from(people.values()).filter(
    (p) => !(p.membershipRole === "ACCOUNT_OWNER" && p.unitNumbers.length === 0 && p.boardTitles.length === 0)
  )
}
