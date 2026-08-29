import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/mail"

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json()
    if (!rawEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }
    const email = (rawEmail as string).trim().toLowerCase()

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
      // Use the request's own email, not user.email (now nullable on the
      // model) - this user was looked up BY that exact address, so they're
      // guaranteed equal here; a null-email account could never have
      // matched the findUnique above in the first place.
      await sendPasswordResetEmail(email, `${baseUrl}/reset-password/${token.token}`)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
