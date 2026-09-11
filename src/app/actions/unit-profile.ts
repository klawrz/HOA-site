"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { UnitContactKind, UnitManagerArea, UnitManagerLevel, DuesFrequency, AgmDocumentPreference } from "@/generated/prisma"
import { DUES_FREQUENCIES } from "@/lib/dues"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

// The Owner retains control of their own unit - only the current owner
// (per UnitOwnership.isCurrent) may manage contacts and delegate a Unit
// Manager for it.
async function requireCurrentOwner(unitId: string, userId: string) {
  return db.unitOwnership.findFirst({
    where: { unitId, ownerId: userId, isCurrent: true },
  })
}

// Mirrors requireOwnerAccess (src/lib/require-owner-access.ts): an
// ACCOUNT_OWNER who has also personally claimed a unit acts as its owner
// too, same as a plain OWNER-role account - requireCurrentOwner still does
// the real per-unit authorization below, this just stops that additive
// role from being rejected before it gets there.
function isOwnerRole(role: string | null | undefined) {
  return role === "OWNER" || role === "ACCOUNT_OWNER"
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
  if (!session || !isOwnerRole(session.user.role)) return { success: false }
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
  if (!session || !isOwnerRole(session.user.role)) return { success: false }

  const contact = await db.unitContact.findUnique({ where: { id: contactId } })
  if (!contact) return { success: false }
  if (!(await requireCurrentOwner(contact.unitId, session.user.id))) return { success: false }

  await db.unitContact.delete({ where: { id: contactId } })

  revalidateUnitPaths(contact.unitId)
  return { success: true }
}

export async function assignUnitManager(unitId: string, userEmail: string) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role)) return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  const user = await db.user.findUnique({ where: { email: userEmail.trim().toLowerCase() } })
  const isUnitManager = user && (await db.membership.findFirst({ where: { userId: user.id, role: "UNIT_MANAGER" } }))
  if (!user || !isUnitManager) {
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

// For the common case where the Owner knows a person (a freelance manager,
// a friend, a small property-management outfit) who doesn't have a HOPE
// account yet - lets the Owner mint an invite themselves instead of routing
// through the Account Owner's org-wide invite panel.
export async function inviteUnitManager(unitId: string, email: string) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role) || !session.user.orgId) return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail) return { success: false, error: "Email required" }

  const existingUser = await db.user.findUnique({ where: { email: trimmedEmail } })
  if (existingUser) {
    return { success: false, error: "An account already exists for that email - assign them directly instead" }
  }

  const existingInvite = await db.invite.findFirst({
    where: { email: trimmedEmail, orgId: session.user.orgId, acceptedAt: null },
  })
  if (existingInvite) return { success: false, error: "A pending invite already exists for this email" }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invite = await db.invite.create({
    data: {
      token: randomUUID(),
      email: trimmedEmail,
      role: "UNIT_MANAGER",
      orgId: session.user.orgId,
      unitId,
      sentById: session.user.id,
      expiresAt,
    },
  })

  revalidateUnitPaths(unitId)
  return { success: true, token: invite.token }
}

// For a manager who will never need to log into HOPE - just a contact
// record on the unit, no account and so no app access grants.
export async function addManualUnitManager(
  unitId: string,
  data: { name: string; phone?: string; email?: string; notes?: string }
) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role)) return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  const name = data.name.trim()
  if (!name) return { success: false, error: "Name required" }

  await db.unitManagerAssignment.create({
    data: {
      unitId,
      name,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  })

  revalidateUnitPaths(unitId)
  return { success: true }
}

export async function setSelfManaged(unitId: string, selfManaged: boolean) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role)) return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  await db.unit.update({ where: { id: unitId }, data: { selfManaged } })

  revalidateUnitPaths(unitId)
  return { success: true }
}

// The unit owner picks how they pay dues (quarterly / semi-annually /
// annually). The Board / PM can also set it, and the Account Owner within
// their own org.
export async function setUnitDuesFrequency(unitId: string, frequency: DuesFrequency) {
  const session = await auth()
  if (!session?.user?.id) return { success: false }
  if (!DUES_FREQUENCIES.includes(frequency)) return { success: false, error: "Invalid frequency" }

  const unit = await db.unit.findUnique({ where: { id: unitId }, select: { orgId: true } })
  if (!unit || unit.orgId !== session.user.orgId) return { success: false }

  const isOwner = !!(await requireCurrentOwner(unitId, session.user.id))
  const isBoardOrPm =
    session.user.role === "BOARD_MEMBER" ||
    session.user.role === "PROPERTY_MANAGER" ||
    session.user.isBoardMember ||
    session.user.role === "ACCOUNT_OWNER"
  if (!isOwner && !isBoardOrPm) return { success: false }

  await db.unit.update({ where: { id: unitId }, data: { duesFrequency: frequency } })

  revalidateUnitPaths(unitId)
  revalidatePath("/dashboard/board/finances/assessments")
  revalidatePath("/dashboard/property-manager/finances/assessments")
  return { success: true }
}

// Which AGM document ("Get your package") this unit's owner gets - the
// short summary or the full informative package. Same access rule as dues
// frequency: the current owner, or Board/PM/Account Owner.
export async function setUnitAgmDocumentPreference(unitId: string, preference: AgmDocumentPreference) {
  const session = await auth()
  if (!session?.user?.id) return { success: false }
  if (preference !== "SUMMARY" && preference !== "FULL") {
    return { success: false, error: "Invalid preference" }
  }

  const unit = await db.unit.findUnique({ where: { id: unitId }, select: { orgId: true } })
  if (!unit || unit.orgId !== session.user.orgId) return { success: false }

  const isOwner = !!(await requireCurrentOwner(unitId, session.user.id))
  const isBoardOrPm =
    session.user.role === "BOARD_MEMBER" ||
    session.user.role === "PROPERTY_MANAGER" ||
    session.user.isBoardMember ||
    session.user.role === "ACCOUNT_OWNER"
  if (!isOwner && !isBoardOrPm) return { success: false }

  await db.unit.update({ where: { id: unitId }, data: { agmDocumentPreference: preference } })

  revalidateUnitPaths(unitId)
  revalidatePath("/dashboard/owner/governance/agm")
  return { success: true }
}

export async function removeUnitManager(assignmentId: string) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role)) return { success: false }

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
  if (!session || !isOwnerRole(session.user.role)) return { success: false }

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

// A custodian's document import (see setup-import.ts) can find an owner's
// phone, emergency contact, and unit manager detail from a roster - but
// UnitContact/UnitManagerAssignment are owner-managed records, so that data
// is staged on the Invite (Invite.imported*) rather than written directly.
// This surfaces it to the real owner once they've accepted, for them to
// apply under their own session.
export async function getImportedUnitContactData(unitId: string) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role) || !session.user.email) return null
  if (!(await requireCurrentOwner(unitId, session.user.id))) return null

  const invite = await db.invite.findFirst({
    where: { unitId, email: session.user.email, role: "OWNER", acceptedAt: { not: null } },
    orderBy: { createdAt: "desc" },
  })
  if (!invite) return null
  const hasAny =
    invite.importedOwnerPhone ||
    invite.importedEmergencyContactName ||
    invite.importedUnitManagerName ||
    invite.importedUnitManagerCompany
  if (!hasAny) return null

  return {
    ownerPhone: invite.importedOwnerPhone,
    emergencyContactName: invite.importedEmergencyContactName,
    emergencyContactPhone: invite.importedEmergencyContactPhone,
    unitManagerName: invite.importedUnitManagerName,
    unitManagerCompany: invite.importedUnitManagerCompany,
    unitManagerEmail: invite.importedUnitManagerEmail,
    unitManagerPhone: invite.importedUnitManagerPhone,
  }
}

async function clearImportedUnitContactData(inviteId: string) {
  await db.invite.update({
    where: { id: inviteId },
    data: {
      importedOwnerPhone: null,
      importedEmergencyContactName: null,
      importedEmergencyContactPhone: null,
      importedUnitManagerName: null,
      importedUnitManagerCompany: null,
      importedUnitManagerEmail: null,
      importedUnitManagerPhone: null,
    },
  })
}

export async function dismissImportedUnitContactData(unitId: string) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role) || !session.user.email) return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  const invite = await db.invite.findFirst({
    where: { unitId, email: session.user.email, role: "OWNER", acceptedAt: { not: null } },
    orderBy: { createdAt: "desc" },
  })
  if (invite) await clearImportedUnitContactData(invite.id)

  revalidateUnitPaths(unitId)
  return { success: true }
}

// Applies the staged import data as real records, under the owner's own
// session - same effect as if they'd filled in Contacts/Unit Manager by
// hand. Only fills User.phone if the owner hasn't already set one
// themselves (never overwrites a value they entered).
export async function applyImportedUnitContactData(unitId: string) {
  const session = await auth()
  if (!session || !isOwnerRole(session.user.role) || !session.user.email) return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  const invite = await db.invite.findFirst({
    where: { unitId, email: session.user.email, role: "OWNER", acceptedAt: { not: null } },
    orderBy: { createdAt: "desc" },
  })
  if (!invite) return { success: false }

  if (invite.importedOwnerPhone) {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { phone: true } })
    if (user && !user.phone) {
      await db.user.update({ where: { id: session.user.id }, data: { phone: invite.importedOwnerPhone } })
    }
  }

  if (invite.importedEmergencyContactName && invite.importedEmergencyContactPhone) {
    await db.unitContact.create({
      data: {
        unitId,
        kind: "EMERGENCY",
        name: invite.importedEmergencyContactName,
        phone: invite.importedEmergencyContactPhone,
      },
    })
  }

  if (invite.importedUnitManagerName || invite.importedUnitManagerCompany) {
    await db.unitManagerAssignment.create({
      data: {
        unitId,
        name: invite.importedUnitManagerName ?? invite.importedUnitManagerCompany,
        phone: invite.importedUnitManagerPhone,
        email: invite.importedUnitManagerEmail,
        notes:
          invite.importedUnitManagerName && invite.importedUnitManagerCompany
            ? invite.importedUnitManagerCompany
            : null,
      },
    })
  }

  await clearImportedUnitContactData(invite.id)
  revalidateUnitPaths(unitId)
  return { success: true }
}
