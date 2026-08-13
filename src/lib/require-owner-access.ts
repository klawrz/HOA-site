import { auth } from "@/auth"
import { db } from "@/lib/db"

// Owner-scoped pages are reachable by a plain OWNER-role session, or by an
// ACCOUNT_OWNER (custodian) who has also personally claimed a unit via
// UnitOwnership - see claimOwnUnit / assignUnitOwner. isBoardMember does the
// same additive-signal trick in the other direction (src/components/
// dashboard/sidebar.tsx); this is the mirror image for unit ownership.
export async function requireOwnerAccess() {
  const session = await auth()
  if (!session?.user.orgId) return null
  if (session.user.role === "OWNER") return session
  if (session.user.role === "ACCOUNT_OWNER") {
    const owns = await db.unitOwnership.findFirst({
      where: { ownerId: session.user.id, isCurrent: true, unit: { orgId: session.user.orgId } },
      select: { id: true },
    })
    if (owns) return session
  }
  return null
}
