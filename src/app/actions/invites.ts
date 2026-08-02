"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { Role } from "@/generated/prisma"

// Shared by the Account Owner invite panel/onboarding wizard (via
// createInvite below) and platform-admin's createOrganization (which invites
// into a brand-new org it doesn't itself belong to) - authorization is
// checked per-call against the target orgId rather than assumed from the
// caller's own session org.
export async function createInviteForOrg(input: { email: string; role: Role; orgId: string; unitId?: string | null }) {
  const session = await auth()
  const isAccountOwnerOfThisOrg = session?.user.orgId === input.orgId && session.user.role === "ACCOUNT_OWNER"
  const isPlatformAdmin = session?.user.isPlatformAdmin === true
  if (!session || (!isAccountOwnerOfThisOrg && !isPlatformAdmin)) throw new Error("Unauthorized")

  const existing = await db.invite.findFirst({
    where: { email: input.email, orgId: input.orgId, acceptedAt: null },
  })
  if (existing) throw new Error("A pending invite already exists for this email")

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invite = await db.invite.create({
    data: {
      token: randomUUID(),
      email: input.email,
      role: input.role,
      orgId: input.orgId,
      unitId: input.unitId ?? null,
      sentById: session.user.id,
      expiresAt,
    },
  })

  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account/invites")
  return invite.token
}

// General-purpose invite panel is only ever shown on the Account Owner's
// page - narrower invite flows (renter, unit manager) mint their own Invite
// rows directly rather than going through this function, so they can apply
// their own, more specific authorization instead of being widened to match
// this one.
export async function createInvite(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const email = (formData.get("email") as string)?.trim()
  const role = formData.get("role") as string
  const unitId = (formData.get("unitId") as string) || null

  if (!email || !role) throw new Error("Email and role required")

  return createInviteForOrg({ email, role: role as Role, orgId: session.user.orgId, unitId })
}

export async function revokeInvite(inviteId: string) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  await db.invite.delete({ where: { id: inviteId, orgId: session.user.orgId } })
  revalidatePath("/dashboard/account/invites")
}
