"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Not signed in" }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user?.password) return { success: false, error: "Account has no password set" }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return { success: false, error: "Current password is incorrect" }

  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters" }
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: user.id }, data: { password: hashed } })

  return { success: true }
}
