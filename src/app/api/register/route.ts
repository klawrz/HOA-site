import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
    "-" + Math.random().toString(36).slice(2, 6)
}

export async function POST(req: Request) {
  try {
    const { name, email, password, orgName } = await req.json()

    if (!name || !email || !password || !orgName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashed, role: "ACCOUNT_OWNER" },
      })
      const org = await tx.organization.create({
        data: { name: orgName, slug: slugify(orgName), members: { connect: { id: user.id } } },
      })
      const updated = await tx.user.update({ where: { id: user.id }, data: { orgId: org.id } })
      return { user: updated, org }
    })

    return NextResponse.json({ id: result.user.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
