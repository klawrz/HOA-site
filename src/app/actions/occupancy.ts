"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { OccupancyType } from "@/generated/prisma"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { rangesOverlap, parseDateOnly } from "@/lib/occupancy"

function revalidateOccupancyPaths(unitId: string) {
  revalidatePath(`/dashboard/owner/units/${unitId}`)
  revalidatePath("/dashboard/owner")
  revalidatePath("/dashboard/unit-manager")
}

async function requireCurrentOwner(unitId: string, userId: string) {
  return db.unitOwnership.findFirst({ where: { unitId, ownerId: userId, isCurrent: true } })
}

// A Unit Manager's authority is per-unit and comes entirely from a grant
// the unit's Owner assigned - not from role alone, matching the same
// pattern used for TICKETS in actions/tickets.ts.
async function unitManagerCanManageOccupancy(userId: string, unitId: string) {
  const assignment = await db.unitManagerAssignment.findUnique({
    where: { unitId_userId: { unitId, userId } },
    include: { grants: true },
  })
  return assignment?.grants.some((g) => g.area === "OCCUPANCY" && g.level === "MANAGE") ?? false
}

async function canManageOccupancy(role: string | null, userId: string, unitId: string) {
  if (role === "OWNER") return !!(await requireCurrentOwner(unitId, userId))
  if (role === "UNIT_MANAGER") return unitManagerCanManageOccupancy(userId, unitId)
  return false
}

export async function createOccupancyEntry(
  unitId: string,
  data: {
    startDate: string
    endDate: string
    type: OccupancyType
    occupantName?: string
    occupantContact?: string
    notes?: string
  },
  // Set once the caller has shown the conflict to the user and they chose
  // to proceed anyway - an overlap is a warning, not a hard block, since
  // owners sometimes deliberately double things up (e.g. a cleaning crew
  // overlapping a guest's checkout day).
  acknowledgeConflict = false
) {
  const session = await auth()
  if (!session) return { success: false }
  if (!(await canManageOccupancy(session.user.role, session.user.id, unitId))) {
    return { success: false }
  }

  const startDate = parseDateOnly(data.startDate)
  const endDate = parseDateOnly(data.endDate)
  if (endDate < startDate) return { success: false, error: "End date must be after start date" }

  if (!acknowledgeConflict) {
    const existing = await db.occupancyEntry.findMany({ where: { unitId } })
    const conflicts = existing.filter((e) => rangesOverlap(startDate, endDate, e.startDate, e.endDate))
    if (conflicts.length > 0) {
      return {
        success: false,
        conflict: true as const,
        conflicts: conflicts.map((c) => ({
          type: c.type,
          occupantName: c.occupantName,
          startDate: c.startDate,
          endDate: c.endDate,
        })),
      }
    }
  }

  await db.occupancyEntry.create({
    data: {
      unitId,
      startDate,
      endDate,
      type: data.type,
      occupantName: data.occupantName || null,
      occupantContact: data.occupantContact || null,
      notes: data.notes || null,
      createdById: session.user.id,
    },
  })

  revalidateOccupancyPaths(unitId)
  return { success: true }
}

export async function updateOccupancyEntry(
  entryId: string,
  data: {
    startDate: string
    endDate: string
    type: OccupancyType
    occupantName?: string
    occupantContact?: string
    notes?: string
  },
  acknowledgeConflict = false
) {
  const session = await auth()
  if (!session) return { success: false }

  const entry = await db.occupancyEntry.findUnique({ where: { id: entryId } })
  if (!entry) return { success: false }
  if (!(await canManageOccupancy(session.user.role, session.user.id, entry.unitId))) {
    return { success: false }
  }

  const startDate = parseDateOnly(data.startDate)
  const endDate = parseDateOnly(data.endDate)
  if (endDate < startDate) return { success: false, error: "End date must be after start date" }

  if (!acknowledgeConflict) {
    const existing = await db.occupancyEntry.findMany({
      where: { unitId: entry.unitId, id: { not: entryId } },
    })
    const conflicts = existing.filter((e) => rangesOverlap(startDate, endDate, e.startDate, e.endDate))
    if (conflicts.length > 0) {
      return {
        success: false,
        conflict: true as const,
        conflicts: conflicts.map((c) => ({
          type: c.type,
          occupantName: c.occupantName,
          startDate: c.startDate,
          endDate: c.endDate,
        })),
      }
    }
  }

  await db.occupancyEntry.update({
    where: { id: entryId },
    data: {
      startDate,
      endDate,
      type: data.type,
      occupantName: data.occupantName || null,
      occupantContact: data.occupantContact || null,
      notes: data.notes || null,
    },
  })

  revalidateOccupancyPaths(entry.unitId)
  return { success: true }
}

export async function deleteOccupancyEntry(entryId: string) {
  const session = await auth()
  if (!session) return { success: false }

  const entry = await db.occupancyEntry.findUnique({ where: { id: entryId } })
  if (!entry) return { success: false }
  if (!(await canManageOccupancy(session.user.role, session.user.id, entry.unitId))) {
    return { success: false }
  }

  await db.occupancyEntry.delete({ where: { id: entryId } })

  revalidateOccupancyPaths(entry.unitId)
  return { success: true }
}

// Occupancy visibility and rental pool membership are entirely the current
// owner's call, independent per audience - never enforced against the
// org's stated policy (see Organization.occupancyVisibilityPolicy), and
// never surfaced to Board/PM as a compliance signal anywhere in this app.
export async function setOccupancyVisibility(
  ownershipId: string,
  data: { visibleToBoard?: boolean; visibleToPM?: boolean }
) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const ownership = await db.unitOwnership.findFirst({
    where: { id: ownershipId, ownerId: session.user.id, isCurrent: true },
  })
  if (!ownership) return { success: false }

  await db.unitOwnership.update({
    where: { id: ownershipId },
    data: {
      ...(data.visibleToBoard !== undefined ? { occupancyVisibleToBoard: data.visibleToBoard } : {}),
      ...(data.visibleToPM !== undefined ? { occupancyVisibleToPM: data.visibleToPM } : {}),
    },
  })

  revalidateOccupancyPaths(ownership.unitId)
  revalidatePath("/dashboard/board/occupancy")
  revalidatePath("/dashboard/property-manager/occupancy")
  return { success: true }
}

// Mutual - a pool member sees every other pool member's occupancy, and
// only those. Joining/leaving is symmetric with everyone else's view, not
// a one-way visibility grant.
export async function setRentalPoolMembership(ownershipId: string, member: boolean) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const ownership = await db.unitOwnership.findFirst({
    where: { id: ownershipId, ownerId: session.user.id, isCurrent: true },
  })
  if (!ownership) return { success: false }

  await db.unitOwnership.update({
    where: { id: ownershipId },
    data: { rentalPoolMember: member },
  })

  revalidateOccupancyPaths(ownership.unitId)
  revalidatePath("/dashboard/owner/rental-pool")
  return { success: true }
}

export async function createShareLink(unitId: string, label: string) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }
  if (!label.trim()) return { success: false, error: "Label required" }

  await db.occupancyShareLink.create({
    data: {
      unitId,
      token: randomUUID(),
      label: label.trim(),
      createdById: session.user.id,
    },
  })

  revalidateOccupancyPaths(unitId)
  return { success: true }
}

// Revoking only requires being the current owner - not the specific
// person who created the link - so a new owner (or the same owner after
// re-organizing their links) can always clean these up.
export async function revokeShareLink(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const link = await db.occupancyShareLink.findUnique({ where: { id } })
  if (!link) return { success: false }
  if (!(await requireCurrentOwner(link.unitId, session.user.id))) return { success: false }

  await db.occupancyShareLink.update({ where: { id }, data: { revokedAt: new Date() } })

  revalidateOccupancyPaths(link.unitId)
  return { success: true }
}
