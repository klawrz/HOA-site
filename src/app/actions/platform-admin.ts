"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { createInviteForOrg } from "@/app/actions/invites"
import { slugify } from "@/lib/slugify"
import { Role } from "@/generated/prisma"

export async function createOrganization(formData: FormData) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const name = (formData.get("name") as string)?.trim()
  const ownerEmail = (formData.get("ownerEmail") as string)?.trim()
  if (!name || !ownerEmail) throw new Error("Organization name and owner email are required")

  const org = await db.organization.create({ data: { name, slug: slugify(name) } })
  const invite = await createInviteForOrg({ email: ownerEmail, role: "ACCOUNT_OWNER", orgId: org.id })

  revalidatePath("/platform-admin")
  return { orgId: org.id, inviteToken: invite.token }
}

export async function updateOrgName(orgId: string, name: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const trimmed = name.trim()
  if (!trimmed) throw new Error("Name is required")

  await db.organization.update({ where: { id: orgId }, data: { name: trimmed } })
  revalidatePath(`/platform-admin/${orgId}`)
  revalidatePath("/platform-admin")
}

// A platform admin can invite into any org after the fact, not just at
// creation time - reuses the same createInviteForOrg core as the Account
// Owner's own invite panel (src/app/actions/invites.ts).
export async function sendOrgInvite(orgId: string, formData: FormData) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const email = (formData.get("email") as string)?.trim()
  const role = formData.get("role") as Role
  const unitId = (formData.get("unitId") as string) || null
  if (!email || !role) throw new Error("Email and role required")

  const invite = await createInviteForOrg({ email, role, orgId, unitId })
  revalidatePath(`/platform-admin/${orgId}`)
  return { id: invite.id, token: invite.token }
}

export async function revokeOrgInvite(inviteId: string, orgId: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  await db.invite.delete({ where: { id: inviteId, orgId } })
  revalidatePath(`/platform-admin/${orgId}`)
}
