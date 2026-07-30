import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/mail"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { email } })

    // Always respond the same way whether or not the account exists, so
    // this endpoint can't be used to find out which emails are registered.
    if (user && user.password) {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1)

      const token = await db.passwordResetToken.create({
        data: { userId: user.id, token: randomUUID(), expiresAt },
      })

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
      await sendPasswordResetEmail(user.email, `${baseUrl}/reset-password/${token.token}`)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
