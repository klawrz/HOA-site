import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { Invite, Prisma } from "@/generated/prisma"
import { tryCompleteOwnershipTransfer } from "@/lib/ownership-transfer"

async function applyUnitEffects(tx: Prisma.TransactionClient, invite: Invite, userId: string) {
  if (invite.unitId && invite.role === "OWNER") {
    if (invite.transferRequestId) {
      // This invite is the new owner's confirmation on a Board-proposed
      // transfer (src/app/actions/unit-ownership.ts) - accepting it is NOT
      // itself "become an owner," it's "I confirm I'm buying this unit."
      // The actual UnitOwnership change only happens once every selling
      // owner has ALSO confirmed - see tryCompleteOwnershipTransfer. We're
      // inside the buyer's own acceptance right now, so their confirmation
      // is true by construction (invite.acceptedAt isn't written until
      // just after this call returns).
      await tryCompleteOwnershipTransfer(tx, invite.transferRequestId, { buyerConfirmedNow: true })
    } else {
      // Deliberately additive, NOT a divest-then-create - accepting a plain
      // owner invite means "join as an owner of this unit," not "replace
      // whoever else owns it." A real second owner (a married couple,
      // partners, co-owning friends - a real pattern seen in Dara's own
      // imported owner roster) can accept their own invite and become a
      // current co-owner alongside an existing one, instead of silently
      // kicking them off.
      await tx.unitOwnership.create({ data: { unitId: invite.unitId, ownerId: userId } })
      await tx.unit.update({ where: { id: invite.unitId }, data: { status: "OWNER_OCCUPIED" } })
    }
  }
  if (invite.unitId && invite.role === "UNIT_MANAGER") {
    await tx.unitManagerAssignment.create({ data: { unitId: invite.unitId, userId } })
  }
  if (invite.unitId && invite.role === "RENTER") {
    // Whoever arranged this (Owner, delegated Unit Manager, or Board/PM)
    // already set the terms when the invite was sent - accepting just
    // turns those terms into the real, active Lease.
    await tx.lease.updateMany({
      where: { unitId: invite.unitId, isActive: true },
      data: { isActive: false, endDate: new Date() },
    })
    await tx.lease.create({
      data: {
        unitId: invite.unitId,
        renterId: userId,
        startDate: invite.leaseStartDate ?? new Date(),
        endDate: invite.leaseEndDate,
        monthlyRent: invite.monthlyRent,
      },
    })
    await tx.unit.update({ where: { id: invite.unitId }, data: { status: "RENTED" } })
  }
}

// Shared by the public /api/invite/accept route and platform-admin's
// dev-only "Quick accept" shortcut - an email that already has an account
// joins as a new Membership; a brand-new email gets a User created with
// the given name/password. Caller is responsible for validating the
// invite itself (not accepted, not expired) before calling this.
export async function acceptInvite(invite: Invite, opts: { name?: string; password?: string }) {
  const existing = await db.user.findUnique({ where: { email: invite.email } })

  if (existing) {
    const alreadyMember = await db.membership.findFirst({
      where: { userId: existing.id, orgId: invite.orgId },
    })
    // A transfer-confirmation invite can legitimately target someone who's
    // already a member of this org (e.g. they already own a different unit
    // in the same HOA and are buying a second one) - confirming a transfer
    // isn't "joining the org," so don't block on it. Every other invite
    // still means "become a new member," which really can only happen once.
    if (alreadyMember && !invite.transferRequestId) throw new Error("Already a member of this organization")

    await db.$transaction(async (tx) => {
      if (!alreadyMember) {
        await tx.membership.create({
          data: { userId: existing.id, orgId: invite.orgId, role: invite.role, isBoardMember: false },
        })
      }
      await applyUnitEffects(tx, invite, existing.id)
      await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
    })
    return { existingAccount: true as const }
  }

  if (!opts.name || !opts.password) throw new Error("Missing fields")
  const hashed = await bcrypt.hash(opts.password, 12)

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: opts.name, email: invite.email, password: hashed } })
    await tx.membership.create({
      data: { userId: user.id, orgId: invite.orgId, role: invite.role, isBoardMember: false },
    })
    await applyUnitEffects(tx, invite, user.id)
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
  })
  return { existingAccount: false as const }
}
