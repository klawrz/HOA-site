"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/occupancy"
import { tryCompleteOwnershipTransfer } from "@/lib/ownership-transfer"
import { randomUUID } from "crypto"

// Deliberately narrower than most Board-adjacent actions (which also allow
// ACCOUNT_OWNER and/or PROPERTY_MANAGER) - Dara specifically wants proposing
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
  revalidatePath("/dashboard/owner")
}

// Replaces the old transferUnitOwnership, which changed UnitOwnership
// immediately on the Board's say-so alone. Per Dara (2026-08-28): "No
// change allowed from what is put in without verification by Board Member
// perhaps and confirmation acceptance by new owner and selling owner." So
// this only PROPOSES the change - it snapshots every current owner as a
// required confirming party and sends the new owner a real Invite. Nothing
// in UnitOwnership actually moves until every seller has confirmed AND the
// buyer has accepted (see tryCompleteOwnershipTransfer).
export async function proposeOwnershipTransfer(data: {
  unitId: string
  newOwnerEmail: string
  newOwnerName: string
  since: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !isBoardMemberOnly(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Only a Board Member can propose an ownership transfer" }
  }
  const orgId = session.user.orgId

  const email = data.newOwnerEmail.trim().toLowerCase()
  if (!email) return { success: false, error: "New owner's email is required" }
  const newOwnerName = data.newOwnerName.trim()
  if (!newOwnerName) return { success: false, error: "New owner's name is required" }
  const sinceDate = parseDateOnly(data.since)

  const unit = await db.unit.findFirst({ where: { id: data.unitId, orgId } })
  if (!unit) return { success: false, error: "Unit not found" }

  const alreadyPending = await db.ownershipTransferRequest.findFirst({
    where: { unitId: unit.id, status: "PENDING" },
  })
  if (alreadyPending) {
    return { success: false, error: "A transfer for this unit is already pending confirmation" }
  }

  const currentOwnerships = await db.unitOwnership.findMany({ where: { unitId: unit.id, isCurrent: true } })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  await db.$transaction(async (tx) => {
    const request = await tx.ownershipTransferRequest.create({
      data: { orgId, unitId: unit.id, newOwnerEmail: email, newOwnerName, since: sinceDate, proposedById: session.user.id },
    })
    // Every current owner must individually confirm they're divesting -
    // a married couple or co-owning friends are each their own party here,
    // not "whoever happened to be first" - per Dara, all of them.
    for (const ownership of currentOwnerships) {
      await tx.ownershipTransferSellerConfirmation.create({
        data: { requestId: request.id, ownerId: ownership.ownerId },
      })
    }
    await tx.invite.create({
      data: {
        token: randomUUID(),
        email,
        role: "OWNER",
        orgId,
        unitId: unit.id,
        sentById: session.user.id,
        expiresAt,
        transferRequestId: request.id,
      },
    })
  })

  revalidateUnitPaths()
  return { success: true }
}

// The selling owner's confirmation - callable by whichever current owner
// the confirmation row belongs to (checked by ownerId, not just "any Board
// member" - this is the seller attesting to their own divestment).
export async function confirmOwnershipTransferAsSeller(requestId: string) {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Not signed in" }

  const confirmation = await db.ownershipTransferSellerConfirmation.findUnique({
    where: { requestId_ownerId: { requestId, ownerId: session.user.id } },
  })
  if (!confirmation) return { success: false, error: "You are not a confirming party on this transfer" }
  if (confirmation.confirmedAt) return { success: true }

  await db.$transaction(async (tx) => {
    await tx.ownershipTransferSellerConfirmation.update({
      where: { id: confirmation.id },
      data: { confirmedAt: new Date() },
    })
    await tryCompleteOwnershipTransfer(tx, requestId)
  })

  revalidateUnitPaths()
  return { success: true }
}

// Board-only, same authorization as proposing - lets the Board back out of
// a pending transfer (e.g. the deal fell through) before every party has
// confirmed. Once CONFIRMED, it's done and can't be cancelled.
export async function cancelOwnershipTransferRequest(requestId: string) {
  const session = await auth()
  if (!session?.user.orgId || !isBoardMemberOnly(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Only a Board Member can cancel a pending transfer" }
  }

  const request = await db.ownershipTransferRequest.findFirst({
    where: { id: requestId, orgId: session.user.orgId, status: "PENDING" },
    include: { invite: true },
  })
  if (!request) return { success: false, error: "No pending transfer found" }

  await db.$transaction(async (tx) => {
    await tx.ownershipTransferRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    })
    if (request.invite && !request.invite.acceptedAt) {
      // Expire the linked invite immediately so it can't still be accepted
      // after the Board has called the deal off.
      await tx.invite.update({ where: { id: request.invite.id }, data: { expiresAt: new Date() } })
    }
  })

  revalidateUnitPaths()
  return { success: true }
}

// --- Co-owner record management ---------------------------------------------
// Distinct from the transfer flow above. A transfer changes WHO owns a unit
// (governance fact, Board-only, needs seller + buyer confirmation). This is
// administrative correction of the co-owner records themselves - fixing a
// combined "Jane & John Smith" placeholder into two people, adding a spouse
// or a co-owning friend, dropping one - which per Dara the custodian OR the
// Board can do directly. A unit can have any number of current owners
// (UnitOwnership allows multiple isCurrent rows); nothing here goes through
// an invite.
function canManageOwnerRecords(role: string, isBoardMember: boolean) {
  return role === "ACCOUNT_OWNER" || role === "BOARD_MEMBER" || isBoardMember
}

export async function addUnitCoOwner(unitId: string, data: { name: string; email?: string }) {
  const session = await auth()
  if (!session?.user.orgId || !canManageOwnerRecords(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not allowed" }
  }
  const orgId = session.user.orgId

  const unit = await db.unit.findFirst({ where: { id: unitId, orgId } })
  if (!unit) return { success: false, error: "Unit not found" }

  const name = data.name.trim()
  const email = data.email?.trim().toLowerCase() || null
  if (!name && !email) return { success: false, error: "A name or an email is required" }

  try {
    await db.$transaction(async (tx) => {
      // With an email we can find-or-create; with none, always a fresh
      // placeholder User (nothing to dedupe on). Email nullable per schema.
      let owner = email ? await tx.user.findUnique({ where: { email } }) : null
      if (!owner) {
        owner = await tx.user.create({ data: { name: name || null, email } })
      } else if (name && name !== owner.name) {
        owner = await tx.user.update({ where: { id: owner.id }, data: { name } })
      }

      const already = await tx.unitOwnership.findFirst({
        where: { unitId, ownerId: owner.id, isCurrent: true },
      })
      if (already) throw new Error("That person is already a current owner of this unit")

      await tx.unitOwnership.create({ data: { unitId, ownerId: owner.id } })
      if (unit.status !== "OWNER_OCCUPIED" && unit.status !== "RENTED") {
        await tx.unit.update({ where: { id: unitId }, data: { status: "OWNER_OCCUPIED" } })
      }
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add owner" }
  }

  revalidateUnitPaths()
  revalidatePath("/dashboard/board/units", "layout")
  return { success: true }
}

export async function editUnitCoOwner(ownershipId: string, data: { name: string; email?: string }) {
  const session = await auth()
  if (!session?.user.orgId || !canManageOwnerRecords(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not allowed" }
  }
  const orgId = session.user.orgId

  const ownership = await db.unitOwnership.findFirst({
    where: { id: ownershipId, isCurrent: true, unit: { orgId } },
  })
  if (!ownership) return { success: false, error: "Ownership record not found" }

  const name = data.name.trim()
  const email = data.email?.trim().toLowerCase() || null

  // Guard against silently merging into someone else's account.
  if (email) {
    const clash = await db.user.findFirst({ where: { email, id: { not: ownership.ownerId } } })
    if (clash) return { success: false, error: "Another person already uses that email" }
  }

  await db.user.update({
    where: { id: ownership.ownerId },
    data: { name: name || null, email },
  })

  revalidateUnitPaths()
  revalidatePath("/dashboard/board/units", "layout")
  return { success: true }
}

export async function removeUnitCoOwner(ownershipId: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageOwnerRecords(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not allowed" }
  }
  const orgId = session.user.orgId

  const ownership = await db.unitOwnership.findFirst({
    where: { id: ownershipId, isCurrent: true, unit: { orgId } },
    include: { unit: true },
  })
  if (!ownership) return { success: false, error: "Ownership record not found" }

  await db.$transaction(async (tx) => {
    await tx.unitOwnership.update({
      where: { id: ownershipId },
      data: { isCurrent: false, divestedAt: new Date() },
    })
    const remaining = await tx.unitOwnership.count({ where: { unitId: ownership.unitId, isCurrent: true } })
    if (remaining === 0 && ownership.unit.status === "OWNER_OCCUPIED") {
      await tx.unit.update({ where: { id: ownership.unitId }, data: { status: "AVAILABLE" } })
    }
  })

  revalidateUnitPaths()
  revalidatePath("/dashboard/board/units", "layout")
  return { success: true }
}
