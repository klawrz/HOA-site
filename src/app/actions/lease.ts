"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { parseDateOnly } from "@/lib/occupancy"

function revalidateLeasePaths(unitId: string) {
  revalidatePath(`/dashboard/owner/units/${unitId}`)
  revalidatePath("/dashboard/owner")
  revalidatePath("/dashboard/owner/rental")
  revalidatePath("/dashboard/unit-manager")
}

async function requireCurrentOwner(unitId: string, userId: string) {
  return db.unitOwnership.findFirst({ where: { unitId, ownerId: userId, isCurrent: true } })
}

// A Unit Manager's authority is per-unit and comes entirely from a grant
// the unit's Owner assigned - matches the same pattern used for
// OCCUPANCY/TICKETS elsewhere. This is what finally gives the GUESTS area
// real meaning: arranging who actually moves into the unit.
async function unitManagerCanManageGuests(userId: string, unitId: string) {
  const assignment = await db.unitManagerAssignment.findUnique({
    where: { unitId_userId: { unitId, userId } },
    include: { grants: true },
  })
  return assignment?.grants.some((g) => g.area === "GUESTS" && g.level === "MANAGE") ?? false
}

// The trusted parties who can actually arrange a rental for a given unit:
// its current Owner, a Unit Manager the Owner delegated GUESTS access to,
// or the Board/PM (who may need to step in, e.g. a non-responsive Owner).
async function canArrangeRental(
  role: string,
  userId: string,
  unitId: string,
  isBoardMember: boolean
) {
  if (role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember) return true
  if (role === "OWNER") return !!(await requireCurrentOwner(unitId, userId))
  if (role === "UNIT_MANAGER") return unitManagerCanManageGuests(userId, unitId)
  return false
}

export async function inviteRenter(
  unitId: string,
  data: { email: string; monthlyRent: number; startDate: string; endDate?: string }
) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }
  if (!(await canArrangeRental(session.user.role, session.user.id, unitId, session.user.isBoardMember))) {
    return { success: false }
  }

  const email = data.email.trim()
  if (!email) return { success: false, error: "Email required" }
  if (!data.monthlyRent || data.monthlyRent <= 0) {
    return { success: false, error: "Monthly rent must be greater than zero" }
  }

  const unit = await db.unit.findUnique({ where: { id: unitId } })
  if (!unit || unit.orgId !== session.user.orgId) return { success: false }

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return { success: false, error: "An account already exists for that email" }
  }

  const existingInvite = await db.invite.findFirst({
    where: { email, orgId: session.user.orgId, acceptedAt: null },
  })
  if (existingInvite) return { success: false, error: "A pending invite already exists for this email" }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invite = await db.invite.create({
    data: {
      token: randomUUID(),
      email,
      role: "RENTER",
      orgId: session.user.orgId,
      unitId,
      sentById: session.user.id,
      expiresAt,
      monthlyRent: data.monthlyRent,
      leaseStartDate: parseDateOnly(data.startDate),
      leaseEndDate: data.endDate ? parseDateOnly(data.endDate) : null,
    },
  })

  revalidateLeasePaths(unitId)
  return { success: true, token: invite.token }
}

export async function endLease(leaseId: string) {
  const session = await auth()
  if (!session) return { success: false }

  const lease = await db.lease.findUnique({ where: { id: leaseId }, include: { unit: true } })
  if (!lease) return { success: false }
  if (!(await canArrangeRental(session.user.role, session.user.id, lease.unitId, session.user.isBoardMember))) {
    return { success: false }
  }

  await db.$transaction([
    db.lease.update({ where: { id: leaseId }, data: { isActive: false, endDate: new Date() } }),
    db.unit.update({ where: { id: lease.unitId }, data: { status: "AVAILABLE" } }),
  ])

  revalidateLeasePaths(lease.unitId)
  return { success: true }
}
