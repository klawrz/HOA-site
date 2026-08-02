"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { createInviteForOrg } from "@/app/actions/invites"
import { acceptInvite } from "@/lib/accept-invite"
import { slugify } from "@/lib/slugify"
import { Role } from "@/generated/prisma"

// Same default password used by every seeded demo account, so a
// quick-accepted test account logs in the same way as the rest of the
// app's test data.
const DEV_DEFAULT_PASSWORD = "password123"

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

// Platform-admin-only variant of updateOrgAddress (src/app/actions/org.ts) -
// that one is gated on the caller's own session.user.orgId/role, which a
// platform admin has neither of, so it needs an explicit orgId param here.
export async function updateOrgAddressAdmin(orgId: string, formData: FormData) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  await db.organization.update({
    where: { id: orgId },
    data: {
      addressLine1: (formData.get("addressLine1") as string) || null,
      addressLine2: (formData.get("addressLine2") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      postalCode: (formData.get("postalCode") as string) || null,
      country: (formData.get("country") as string) || null,
    },
  })
  revalidatePath(`/platform-admin/${orgId}`)
}

// Billing/account-owner record a platform admin keeps for their own
// tracking - independent of whether the invited Account Owner has accepted
// their invite yet (there may be no User row at all for this org's owner).
export async function updateOrgBillingProfile(orgId: string, formData: FormData) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const str = (name: string) => (formData.get(name) as string)?.trim() || null
  const expiryRaw = formData.get("billingExpiry") as string
  const billingExpiry = expiryRaw ? new Date(expiryRaw) : null

  await db.organization.update({
    where: { id: orgId },
    data: {
      accountNumber: str("accountNumber"),
      pricingPlan: str("pricingPlan"),
      billingExpiry,
      accountOwnerName: str("accountOwnerName"),
      accountOwnerEmail: str("accountOwnerEmail"),
      accountOwnerPhone: str("accountOwnerPhone"),
      accountOwnerAddressLine1: str("accountOwnerAddressLine1"),
      accountOwnerAddressLine2: str("accountOwnerAddressLine2"),
      accountOwnerCity: str("accountOwnerCity"),
      accountOwnerState: str("accountOwnerState"),
      accountOwnerPostalCode: str("accountOwnerPostalCode"),
      accountOwnerCountry: str("accountOwnerCountry"),
      altContactName: str("altContactName"),
      altContactEmail: str("altContactEmail"),
      altContactPhone: str("altContactPhone"),
    },
  })
  revalidatePath(`/platform-admin/${orgId}`)
}

// Stopgap for testing while HOPE has no live email delivery - simulates a
// recipient clicking their invite link and accepting it, without needing
// to actually copy/paste the link. A brand-new email gets a real account
// with DEV_DEFAULT_PASSWORD so it's immediately usable; an existing email
// just gains the Membership, same branching as the real accept route.
// Platform-admin-gated only - remove once real email delivery lands.
export async function quickAcceptInvite(inviteId: string, orgId: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const invite = await db.invite.findUnique({ where: { id: inviteId } })
  if (!invite || invite.orgId !== orgId || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("Invite is invalid or expired")
  }

  const existing = await db.user.findUnique({ where: { email: invite.email } })
  const result = await acceptInvite(
    invite,
    existing ? {} : { name: invite.email.split("@")[0], password: DEV_DEFAULT_PASSWORD }
  )

  revalidatePath(`/platform-admin/${orgId}`)
  return { ...result, password: existing ? null : DEV_DEFAULT_PASSWORD }
}
