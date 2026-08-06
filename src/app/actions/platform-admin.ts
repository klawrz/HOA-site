"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { createInviteForOrg } from "@/app/actions/invites"
import { acceptInvite } from "@/lib/accept-invite"
import { slugify } from "@/lib/slugify"
import { Role } from "@/generated/prisma"
import bcrypt from "bcryptjs"

// Same default password used by every seeded demo account, so a
// quick-accepted test account logs in the same way as the rest of the
// app's test data.
const DEV_DEFAULT_PASSWORD = "password123"

// Front-loaded alternative to the invite-link model used everywhere else -
// platform admin sets the Account Owner's password directly, so the login
// works immediately with no pending invite step. If the email already has
// a HOPE account, this just adds the ACCOUNT_OWNER membership to it (their
// existing password is never touched) - same reasoning as acceptInvite's
// existing-user branch.
export async function createOrganizationWithOwner(data: {
  orgName: string
  ownerName: string
  ownerEmail: string
  password: string
  accountNumber?: string
  pricingPlan?: string
  billingExpiry?: string
  paymentMethod?: string
}) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const orgName = data.orgName.trim()
  const ownerName = data.ownerName.trim()
  const ownerEmail = data.ownerEmail.trim().toLowerCase()
  if (!orgName || !ownerName || !ownerEmail) {
    throw new Error("Organization name, owner name, and email are required")
  }

  const org = await db.organization.create({
    data: {
      name: orgName,
      slug: slugify(orgName),
      accountNumber: data.accountNumber?.trim() || null,
      pricingPlan: data.pricingPlan?.trim() || null,
      billingExpiry: data.billingExpiry ? new Date(data.billingExpiry) : null,
      paymentMethod: data.paymentMethod?.trim() || null,
    },
  })

  const existing = await db.user.findUnique({ where: { email: ownerEmail } })
  let usedExistingAccount = false
  if (existing) {
    usedExistingAccount = true
    const alreadyMember = await db.membership.findFirst({ where: { userId: existing.id, orgId: org.id } })
    if (!alreadyMember) {
      await db.membership.create({ data: { userId: existing.id, orgId: org.id, role: "ACCOUNT_OWNER" } })
    }
  } else {
    if (!data.password || data.password.length < 8) throw new Error("Password must be at least 8 characters")
    const hashed = await bcrypt.hash(data.password, 12)
    const user = await db.user.create({ data: { name: ownerName, email: ownerEmail, password: hashed } })
    await db.membership.create({ data: { userId: user.id, orgId: org.id, role: "ACCOUNT_OWNER" } })
  }

  revalidatePath("/platform-admin")
  return { orgId: org.id, orgName: org.name, usedExistingAccount }
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

// Fast-start convenience for the New Organization wizard - platform admin
// knows the property size up front, so pre-generate sequentially-numbered
// units rather than making the Account Owner add every one by hand on
// first login. Only fires on a unit-less org (never called again once the
// wizard's Basic Data step has been submitted once), so re-editing address
// details afterward can't duplicate units.
export async function autoGenerateUnitsAdmin(orgId: string, count: number) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")
  if (!Number.isInteger(count) || count < 1 || count > 500) {
    throw new Error("Number of units must be between 1 and 500")
  }

  const existing = await db.unit.count({ where: { orgId } })
  if (existing > 0) return { created: 0 }

  await db.unit.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      orgId,
      number: String(i + 1),
      status: "AVAILABLE" as const,
    })),
  })
  revalidatePath(`/platform-admin/${orgId}`)
  return { created: count }
}

// Billing/account-owner record a platform admin keeps for their own
// tracking - independent of whether the invited Account Owner has accepted
// their invite yet (there may be no User row at all for this org's owner).
// Only writes fields actually present in the submitted FormData - this is
// called separately by the Account/Billing step, the Account Owner Data
// step, and the platform-admin edit cards, each of which posts a different
// subset of these fields. Unconditionally nulling absent fields would wipe
// out data saved by one of the other callers.
export async function updateOrgBillingProfile(orgId: string, formData: FormData) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  const str = (name: string) => (formData.get(name) as string)?.trim() || null
  const data: Record<string, string | Date | null> = {}

  if (formData.has("accountNumber")) data.accountNumber = str("accountNumber")
  if (formData.has("pricingPlan")) data.pricingPlan = str("pricingPlan")
  if (formData.has("billingExpiry")) {
    const expiryRaw = formData.get("billingExpiry") as string
    data.billingExpiry = expiryRaw ? new Date(expiryRaw) : null
  }
  if (formData.has("accountOwnerName")) data.accountOwnerName = str("accountOwnerName")
  if (formData.has("accountOwnerTitle")) data.accountOwnerTitle = str("accountOwnerTitle")
  if (formData.has("accountOwnerEmail")) data.accountOwnerEmail = str("accountOwnerEmail")
  if (formData.has("accountOwnerPhone")) data.accountOwnerPhone = str("accountOwnerPhone")
  if (formData.has("accountOwnerAddressLine1")) data.accountOwnerAddressLine1 = str("accountOwnerAddressLine1")
  if (formData.has("accountOwnerAddressLine2")) data.accountOwnerAddressLine2 = str("accountOwnerAddressLine2")
  if (formData.has("accountOwnerCity")) data.accountOwnerCity = str("accountOwnerCity")
  if (formData.has("accountOwnerState")) data.accountOwnerState = str("accountOwnerState")
  if (formData.has("accountOwnerPostalCode")) data.accountOwnerPostalCode = str("accountOwnerPostalCode")
  if (formData.has("accountOwnerCountry")) data.accountOwnerCountry = str("accountOwnerCountry")
  if (formData.has("altContactName")) data.altContactName = str("altContactName")
  if (formData.has("altContactEmail")) data.altContactEmail = str("altContactEmail")
  if (formData.has("altContactPhone")) data.altContactPhone = str("altContactPhone")

  await db.organization.update({ where: { id: orgId }, data })
  revalidatePath(`/platform-admin/${orgId}`)
}

// Reversible lockout - every member (including the Account Owner) is
// blocked from the dashboard while suspended, but no data is touched. See
// the check in src/app/dashboard/layout.tsx.
export async function suspendOrganization(orgId: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  await db.organization.update({ where: { id: orgId }, data: { suspendedAt: new Date() } })
  revalidatePath(`/platform-admin/${orgId}`)
  revalidatePath("/platform-admin")
}

export async function unsuspendOrganization(orgId: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  await db.organization.update({ where: { id: orgId }, data: { suspendedAt: null } })
  revalidatePath(`/platform-admin/${orgId}`)
  revalidatePath("/platform-admin")
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
