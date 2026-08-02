import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { Invite, Prisma } from "@/generated/prisma"

async function applyUnitEffects(tx: Prisma.TransactionClient, invite: Invite, userId: string) {
  if (invite.unitId && invite.role === "OWNER") {
    await tx.unitOwnership.updateMany({
      where: { unitId: invite.unitId, isCurrent: true },
      data: { isCurrent: false, divestedAt: new Date() },
    })
    await tx.unitOwnership.create({ data: { unitId: invite.unitId, ownerId: userId } })
    await tx.unit.update({ where: { id: invite.unitId }, data: { status: "OWNER_OCCUPIED" } })
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
    if (alreadyMember) throw new Error("Already a member of this organization")

    await db.$transaction(async (tx) => {
      await tx.membership.create({
        data: { userId: existing.id, orgId: invite.orgId, role: invite.role, isBoardMember: false },
      })
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
