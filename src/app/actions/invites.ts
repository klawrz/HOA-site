"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

// General-purpose invite panel is only ever shown on the Account Owner's
// page - restricted to that role here too, since it can invite to any
// role including ACCOUNT_OWNER/BOARD_MEMBER. Narrower invite flows (renter,
// unit manager) mint their own Invite rows directly rather than going
// through this function, so they can apply their own, more specific
// authorization instead of being widened to match this one.
export async function createInvite(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")

  const email = (formData.get("email") as string)?.trim()
  const role = formData.get("role") as string
  const unitId = (formData.get("unitId") as string) || null

  if (!email || !role) throw new Error("Email and role required")

  const existing = await db.invite.findFirst({
    where: { email, orgId: session.user.orgId, acceptedAt: null },
  })
  if (existing) throw new Error("A pending invite already exists for this email")

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invite = await db.invite.create({
    data: {
      token: randomUUID(),
      email,
      role: role as import("@/generated/prisma").Role,
      orgId: session.user.orgId,
      unitId: unitId || null,
      sentById: session.user.id,
      expiresAt,
    },
  })

  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account/invites")
  return invite.token
}

export async function revokeInvite(inviteId: string) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  await db.invite.delete({ where: { id: inviteId, orgId: session.user.orgId } })
  revalidatePath("/dashboard/account/invites")
}
