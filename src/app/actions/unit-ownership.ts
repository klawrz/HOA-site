"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/occupancy"

// Deliberately narrower than most Board-adjacent actions (which also allow
// ACCOUNT_OWNER and/or PROPERTY_MANAGER) - Dara specifically wants recording
// an ownership transfer to be a Board-only act, same reasoning as
// approvePMContract being Board-only in src/app/actions/pm.ts (a PM can't
// approve its own engagement; here, ownership-of-record is a governance
// fact the Board attests to, not an administrative data-entry task).
function isBoardMemberOnly(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || isBoardMember
}

function revalidateUnitPaths() {
  revalidatePath("/dashboard/board/units")
  revalidatePath("/dashboard/account/units")
  revalidatePath("/dashboard/account/members")
  revalidatePath("/dashboard/property-manager/units")
}

// The owner roster is a right of the org's governance, independent of
// whether that person has ever logged into HOPE (per Dara, 2026-08-27) -
// so this creates the new owner's User/Membership/UnitOwnership rows
// immediately, synchronously, rather than deferring the ownership fact
// until an invite is accepted. A brand-new owner's account is created with
// password: null (already a supported, safe state - auth.ts's authorize()
// already refuses login cleanly when password is null) - "incomplete
// until they agree and want to participate." Sending them an actual way to
// claim/set a password is a separate, not-yet-built follow-up.
export async function transferUnitOwnership(data: {
  unitId: string
  newOwnerEmail: string
  newOwnerName: string
  since: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !isBoardMemberOnly(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Only a Board Member can record an ownership transfer" }
  }
  const orgId = session.user.orgId

  const email = data.newOwnerEmail.trim().toLowerCase()
  if (!email) return { success: false, error: "New owner's email is required" }
  const sinceDate = parseDateOnly(data.since)

  const unit = await db.unit.findFirst({ where: { id: data.unitId, orgId } })
  if (!unit) return { success: false, error: "Unit not found" }

  await db.$transaction(async (tx) => {
    // Divest whoever currently holds it, effective the same date the new
    // ownership begins - a clean handoff, no gap or overlap.
    await tx.unitOwnership.updateMany({
      where: { unitId: unit.id, isCurrent: true },
      data: { isCurrent: false, divestedAt: sinceDate },
    })

    let user = await tx.user.findUnique({ where: { email } })
    if (!user) {
      user = await tx.user.create({ data: { email, name: data.newOwnerName.trim() || null, password: null } })
    }

    const existingMembership = await tx.membership.findUnique({
      where: { userId_orgId: { userId: user.id, orgId } },
    })
    if (!existingMembership) {
      await tx.membership.create({ data: { userId: user.id, orgId, role: "OWNER" } })
    }

    await tx.unitOwnership.create({
      data: { unitId: unit.id, ownerId: user.id, since: sinceDate },
    })
    await tx.unit.update({ where: { id: unit.id }, data: { status: "OWNER_OCCUPIED" } })
  })

  revalidateUnitPaths()
  return { success: true }
}
