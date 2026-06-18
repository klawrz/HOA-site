import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { token, name, password } = await req.json()
    if (!token || !name || !password) {
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
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: invite.email, password: hashed, role: invite.role, orgId: invite.orgId },
      })
      if (invite.unitId && invite.role === "OWNER") {
        await tx.unitOwnership.create({ data: { unitId: invite.unitId, ownerId: user.id } })
        await tx.unit.update({ where: { id: invite.unitId }, data: { status: "OWNER_OCCUPIED" } })
      }
      await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
