import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

// Lets the login page know, before calling signIn, whether this email has
// more than one Membership (and needs an org picker) - without ever
// revealing that before the password is actually proven. Issues no
// session/cookie of its own.
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ ok: false })
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      return NextResponse.json({ ok: false })
    }
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ ok: false })
    }

    const memberships = await db.membership.findMany({
      where: { userId: user.id },
      include: { org: { select: { id: true, name: true } } },
    })

    return NextResponse.json({
      ok: true,
      memberships: memberships.map((m) => ({ orgId: m.org.id, orgName: m.org.name, role: m.role })),
    })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
