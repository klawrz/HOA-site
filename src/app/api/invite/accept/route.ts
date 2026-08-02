import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { token, name, password } = await req.json()
    if (!token) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const invite = await db.invite.findUnique({
      where: { token },
      include: { org: true },
    })

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite is invalid or expired" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email: invite.email } })

    // An email that already has an account joins this org as a new
    // Membership instead of being rejected - the whole point of multi-org
    // is that the same login can belong to more than one organization.
    if (existing) {
      const alreadyMember = await db.membership.findFirst({
        where: { userId: existing.id, orgId: invite.orgId },
      })
      if (alreadyMember) {
        return NextResponse.json({ error: "Already a member of this organization" }, { status: 409 })
      }

      await db.$transaction(async (tx) => {
        await tx.membership.create({
          data: { userId: existing.id, orgId: invite.orgId, role: invite.role, isBoardMember: false },
        })
        if (invite.unitId && invite.role === "OWNER") {
          await tx.unitOwnership.updateMany({
            where: { unitId: invite.unitId, isCurrent: true },
            data: { isCurrent: false, divestedAt: new Date() },
          })
          await tx.unitOwnership.create({ data: { unitId: invite.unitId, ownerId: existing.id } })
          await tx.unit.update({ where: { id: invite.unitId }, data: { status: "OWNER_OCCUPIED" } })
        }
        if (invite.unitId && invite.role === "RENTER") {
          await tx.lease.updateMany({
            where: { unitId: invite.unitId, isActive: true },
            data: { isActive: false, endDate: new Date() },
          })
          await tx.lease.create({
            data: {
              unitId: invite.unitId,
              renterId: existing.id,
              startDate: invite.leaseStartDate ?? new Date(),
              endDate: invite.leaseEndDate,
              monthlyRent: invite.monthlyRent,
            },
          })
          await tx.unit.update({ where: { id: invite.unitId }, data: { status: "RENTED" } })
        }
        await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
      })

      return NextResponse.json({ ok: true, existingAccount: true }, { status: 200 })
    }

    if (!name || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    const hashed = await bcrypt.hash(password, 12)

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: invite.email, password: hashed },
      })
      await tx.membership.create({
        data: { userId: user.id, orgId: invite.orgId, role: invite.role, isBoardMember: false },
      })
      if (invite.unitId && invite.role === "OWNER") {
        await tx.unitOwnership.updateMany({
          where: { unitId: invite.unitId, isCurrent: true },
          data: { isCurrent: false, divestedAt: new Date() },
        })
        await tx.unitOwnership.create({ data: { unitId: invite.unitId, ownerId: user.id } })
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
            renterId: user.id,
            startDate: invite.leaseStartDate ?? new Date(),
            endDate: invite.leaseEndDate,
            monthlyRent: invite.monthlyRent,
          },
        })
        await tx.unit.update({ where: { id: invite.unitId }, data: { status: "RENTED" } })
      }
      await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
