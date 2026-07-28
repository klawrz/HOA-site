"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { UnitContactKind, UnitManagerArea, UnitManagerLevel } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

// The Owner retains control of their own unit - only the current owner
// (per UnitOwnership.isCurrent) may manage contacts and delegate a Unit
// Manager for it.
async function requireCurrentOwner(unitId: string, userId: string) {
  return db.unitOwnership.findFirst({
    where: { unitId, ownerId: userId, isCurrent: true },
  })
}

function revalidateUnitPaths(unitId: string) {
  revalidatePath(`/dashboard/owner/units/${unitId}`)
  revalidatePath("/dashboard/owner")
  revalidatePath("/dashboard/unit-manager")
}

export async function addUnitContact(data: {
  unitId: string
  kind: UnitContactKind
  name: string
  phone: string
  email?: string
  notes?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }
  if (!(await requireCurrentOwner(data.unitId, session.user.id))) return { success: false }

  await db.unitContact.create({
    data: {
      unitId: data.unitId,
      kind: data.kind,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      notes: data.notes || null,
    },
  })

  revalidateUnitPaths(data.unitId)
  return { success: true }
}

export async function removeUnitContact(contactId: string) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const contact = await db.unitContact.findUnique({ where: { id: contactId } })
  if (!contact) return { success: false }
  if (!(await requireCurrentOwner(contact.unitId, session.user.id))) return { success: false }

  await db.unitContact.delete({ where: { id: contactId } })

  revalidateUnitPaths(contact.unitId)
  return { success: true }
}

export async function assignUnitManager(unitId: string, userEmail: string) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  const user = await db.user.findUnique({ where: { email: userEmail } })
  if (!user || user.role !== "UNIT_MANAGER") {
    return { success: false, error: "No Unit Manager account found with that email" }
  }

  const existing = await db.unitManagerAssignment.findUnique({
    where: { unitId_userId: { unitId, userId: user.id } },
  })
  if (existing) return { success: false, error: "Already assigned to this unit" }

  await db.unitManagerAssignment.create({ data: { unitId, userId: user.id } })

  revalidateUnitPaths(unitId)
  return { success: true }
}

export async function removeUnitManager(assignmentId: string) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const assignment = await db.unitManagerAssignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) return { success: false }
  if (!(await requireCurrentOwner(assignment.unitId, session.user.id))) return { success: false }

  await db.unitManagerAssignment.delete({ where: { id: assignmentId } })

  revalidateUnitPaths(assignment.unitId)
  return { success: true }
}

export async function setUnitManagerGrant(
  assignmentId: string,
  area: UnitManagerArea,
  level: UnitManagerLevel | null
) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const assignment = await db.unitManagerAssignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) return { success: false }
  if (!(await requireCurrentOwner(assignment.unitId, session.user.id))) return { success: false }

  if (level === null) {
    await db.unitManagerGrant.deleteMany({ where: { assignmentId, area } })
  } else {
    await db.unitManagerGrant.upsert({
      where: { assignmentId_area: { assignmentId, area } },
      create: { assignmentId, area, level },
      update: { level },
    })
  }

  revalidateUnitPaths(assignment.unitId)
  return { success: true }
}
