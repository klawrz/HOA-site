import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { Role } from "@/generated/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, phone, company, role } = body

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone: phone || null,
        company: company || null,
        role: role as Role,
      },
    })

    return NextResponse.json({ id: user.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
