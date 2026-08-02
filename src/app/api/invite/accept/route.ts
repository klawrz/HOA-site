import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { acceptInvite } from "@/lib/accept-invite"

export async function POST(req: Request) {
  try {
    const { token, name, password } = await req.json()
    if (!token) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const invite = await db.invite.findUnique({ where: { token } })

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite is invalid or expired" }, { status: 400 })
    }

    const result = await acceptInvite(invite, { name, password })
    return NextResponse.json({ ok: true, ...result }, { status: result.existingAccount ? 200 : 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    const status =
      message === "Already a member of this organization" ? 409 :
      message === "Missing fields" ? 400 :
      500
    return NextResponse.json({ error: message }, { status })
  }
}
