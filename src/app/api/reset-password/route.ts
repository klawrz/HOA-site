import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const resetToken = await db.passwordResetToken.findUnique({ where: { token } })
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await db.$transaction([
      db.user.update({ where: { id: resetToken.userId }, data: { password: hashed } }),
      // Using one token invalidates every other outstanding token for this
      // user, same as a password change should - an old, unused reset link
      // must not still work afterwards.
      db.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
