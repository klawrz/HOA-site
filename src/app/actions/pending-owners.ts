"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { createInviteForOrg } from "./invites"

// A staged owner roster entry - see the comment on the PendingOwner model
// in schema.prisma. Adding someone here never creates a real invite token;
// it's just content the custodian is assembling (by hand, or from a
// document import), possibly over several days, before choosing to
// actually send anything. Sending is its own explicit action below.

function revalidateOwnerPaths() {
  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account")
  revalidatePath("/dashboard/account/members")
}

type PendingOwnerFields = {
  name?: string | null
  email?: string | null
  phone?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  unitManagerName?: string | null
  unitManagerCompany?: string | null
  unitManagerEmail?: string | null
  unitManagerPhone?: string | null
}

async function requireAccountOwner() {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")
  return { orgId: session.user.orgId, userId: session.user.id }
}

export async function upsertPendingOwner(unitId: string, data: PendingOwnerFields) {
  const { orgId } = await requireAccountOwner()

  const unit = await db.unit.findFirst({ where: { id: unitId, orgId } })
  if (!unit) throw new Error("Unit not found")

  const fields = {
    name: data.name || null,
    email: data.email || null,
    phone: data.phone || null,
    emergencyContactName: data.emergencyContactName || null,
    emergencyContactPhone: data.emergencyContactPhone || null,
    unitManagerName: data.unitManagerName || null,
    unitManagerCompany: data.unitManagerCompany || null,
    unitManagerEmail: data.unitManagerEmail || null,
    unitManagerPhone: data.unitManagerPhone || null,
  }

  const row = await db.pendingOwner.upsert({
    where: { orgId_unitId: { orgId, unitId } },
    // A second upload/entry for a unit already on the roster fills in
    // blanks rather than clobbering what's there - same "existing non-empty
    // wins" rule the client-side merge in import-documents-panel.tsx uses,
    // kept consistent now that the roster is server-persisted instead of
    // living only in that component's local state.
    update: {
      name: fields.name ?? undefined,
      email: fields.email ?? undefined,
      phone: fields.phone ?? undefined,
      emergencyContactName: fields.emergencyContactName ?? undefined,
      emergencyContactPhone: fields.emergencyContactPhone ?? undefined,
      unitManagerName: fields.unitManagerName ?? undefined,
      unitManagerCompany: fields.unitManagerCompany ?? undefined,
      unitManagerEmail: fields.unitManagerEmail ?? undefined,
      unitManagerPhone: fields.unitManagerPhone ?? undefined,
    },
    create: { orgId, unitId, ...fields },
  })

  revalidateOwnerPaths()
  return row
}

// Mirrors the old inviteOwnersByUnitNumber's unit-matching/auto-create
// behavior (see invites.ts) - a roster document naming a unit that isn't
// on file yet still gets that unit created, so population always happens
// before anything is staged, same reasoning as before.
export async function upsertPendingOwnersByUnitNumber(
  rows: (PendingOwnerFields & { unitNumber: string })[]
) {
  const { orgId } = await requireAccountOwner()

  const units = await db.unit.findMany({ where: { orgId }, select: { id: true, number: true } })
  const unitByNumber = new Map(units.map((u) => [u.number.trim().toLowerCase(), u.id]))

  const results: { unitNumber: string; success: boolean; error?: string }[] = []
  for (const row of rows) {
    const unitNumber = row.unitNumber.trim()
    if (!unitNumber) {
      results.push({ unitNumber: row.unitNumber, success: false, error: "Missing unit number" })
      continue
    }
    let unitId = unitByNumber.get(unitNumber.toLowerCase())
    if (!unitId) {
      const createdUnit = await db.unit.create({ data: { orgId, number: unitNumber } })
      unitId = createdUnit.id
      unitByNumber.set(unitNumber.toLowerCase(), unitId)
    }
    try {
      await upsertPendingOwner(unitId, row)
      results.push({ unitNumber, success: true })
    } catch (err) {
      results.push({ unitNumber, success: false, error: err instanceof Error ? err.message : "Failed" })
    }
  }
  return results
}

export async function removePendingOwner(id: string) {
  const { orgId } = await requireAccountOwner()
  await db.pendingOwner.deleteMany({ where: { id, orgId } })
  revalidateOwnerPaths()
  return { success: true }
}

// Converts one staged roster entry into a real Invite - the actual
// "sending" moment, deliberately separate from adding the owner's info.
// The imported contact detail (phone/emergency/unit manager) rides along
// onto the Invite exactly as it used to when this was one combined step -
// see Invite.importedOwnerPhone in schema.prisma.
export async function sendPendingOwnerInvite(id: string) {
  const { orgId } = await requireAccountOwner()

  const pending = await db.pendingOwner.findFirst({ where: { id, orgId } })
  if (!pending) return { success: false, error: "Not found" }
  if (!pending.email?.trim()) return { success: false, error: "Add an email before sending" }

  try {
    const invite = await createInviteForOrg({
      email: pending.email,
      role: "OWNER",
      orgId,
      unitId: pending.unitId,
    })

    const hasImportedContactData =
      pending.phone || pending.emergencyContactName || pending.emergencyContactPhone ||
      pending.unitManagerName || pending.unitManagerCompany || pending.unitManagerEmail || pending.unitManagerPhone
    if (hasImportedContactData) {
      await db.invite.update({
        where: { id: invite.id },
        data: {
          importedOwnerPhone: pending.phone,
          importedEmergencyContactName: pending.emergencyContactName,
          importedEmergencyContactPhone: pending.emergencyContactPhone,
          importedUnitManagerName: pending.unitManagerName,
          importedUnitManagerCompany: pending.unitManagerCompany,
          importedUnitManagerEmail: pending.unitManagerEmail,
          importedUnitManagerPhone: pending.unitManagerPhone,
        },
      })
    }

    await db.pendingOwner.delete({ where: { id: pending.id } })
    revalidateOwnerPaths()
    return { success: true, token: invite.token }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send invite" }
  }
}

// Converts a staged roster entry directly into real owner(s) - Membership
// + UnitOwnership - WITHOUT going through Invite/acceptance at all. Per
// Dara, 2026-08-28: "all identified owners get membership whether or not
// they need or use it" - the owner roster is a right of governance,
// independent of whether that person ever logs into HOPE (same reasoning
// as the old transferUnitOwnership's eager User creation). No email is
// ever sent here - this is a purely internal record, safe to redo/correct
// since nothing external is triggered. Accepts more than one {name, email}
// pair since a unit's PendingOwner entry can represent joint owners
// (a married couple, family members) sharing one staged row.
//
// email is optional (User.email became nullable 2026-08-28, per Dara:
// "many owners may not have provided emails but can be pending full
// members") - a no-email owner always gets a brand-new User (there's no
// email to look up an existing one by, and none is fabricated), and
// simply has no way to log in until a real email is added later.
export async function convertPendingOwnerToRealOwners(
  pendingOwnerId: string,
  owners: { name: string; email?: string | null }[]
) {
  const { orgId } = await requireAccountOwner()

  const pending = await db.pendingOwner.findFirst({ where: { id: pendingOwnerId, orgId } })
  if (!pending) return { success: false, error: "Not found" }
  if (owners.length === 0) return { success: false, error: "At least one owner is required" }

  await db.$transaction(async (tx) => {
    for (const o of owners) {
      const email = o.email?.trim().toLowerCase() || null
      let user = email ? await tx.user.findUnique({ where: { email } }) : null
      if (!user) {
        user = await tx.user.create({ data: { email, name: o.name.trim() || null, password: null } })
      }
      const existingMembership = await tx.membership.findUnique({
        where: { userId_orgId: { userId: user.id, orgId } },
      })
      if (!existingMembership) {
        await tx.membership.create({ data: { userId: user.id, orgId, role: "OWNER" } })
      }
      const existingOwnership = await tx.unitOwnership.findFirst({
        where: { unitId: pending.unitId, ownerId: user.id, isCurrent: true },
      })
      if (!existingOwnership) {
        await tx.unitOwnership.create({ data: { unitId: pending.unitId, ownerId: user.id } })
      }
    }
    await tx.unit.update({ where: { id: pending.unitId }, data: { status: "OWNER_OCCUPIED" } })
    await tx.pendingOwner.delete({ where: { id: pending.id } })
  })

  revalidateOwnerPaths()
  revalidatePath("/dashboard/board/units")
  revalidatePath("/dashboard/owner")
  return { success: true }
}

// Bulk version - sends every staged owner that has an email, leaving
// anyone still missing one on the roster rather than failing the batch.
export async function sendAllPendingOwners() {
  const { orgId } = await requireAccountOwner()

  const rows = await db.pendingOwner.findMany({ where: { orgId }, include: { unit: { select: { number: true } } } })
  const results: { unitNumber: string; email: string | null; success: boolean; error?: string }[] = []
  for (const row of rows) {
    if (!row.email?.trim()) {
      results.push({ unitNumber: row.unit.number, email: row.email, success: false, error: "No email on file" })
      continue
    }
    const result = await sendPendingOwnerInvite(row.id)
    results.push({ unitNumber: row.unit.number, email: row.email, success: result.success, error: "error" in result ? result.error : undefined })
  }
  return results
}
