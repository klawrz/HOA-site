"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { createInviteForOrg } from "@/app/actions/invites"
import { slugify } from "@/lib/slugify"

export async function createOrganization(formData: FormData) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const name = (formData.get("name") as string)?.trim()
  const ownerEmail = (formData.get("ownerEmail") as string)?.trim()
  if (!name || !ownerEmail) throw new Error("Organization name and owner email are required")

  const org = await db.organization.create({ data: { name, slug: slugify(name) } })
  const inviteToken = await createInviteForOrg({ email: ownerEmail, role: "ACCOUNT_OWNER", orgId: org.id })

  revalidatePath("/platform-admin")
  return { orgId: org.id, inviteToken }
}
