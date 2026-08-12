"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { Role } from "@/generated/prisma"

// Shared by the Account Owner invite panel/onboarding wizard (via
// createInvite below) and platform-admin's sendOrgInvite (invites into an
// org the platform admin doesn't itself belong to) - authorization is
// checked per-call against the target orgId rather than assumed from the
// caller's own session org.
export async function createInviteForOrg(input: { email: string; role: Role; orgId: string; unitId?: string | null }) {
  const session = await auth()
  const isAccountOwnerOfThisOrg = session?.user.orgId === input.orgId && session.user.role === "ACCOUNT_OWNER"
  const isPlatformAdmin = session?.user.isPlatformAdmin === true
  if (!session || (!isAccountOwnerOfThisOrg && !isPlatformAdmin)) throw new Error("Unauthorized")

  const email = input.email.trim().toLowerCase()

  const existing = await db.invite.findFirst({
    where: { email, orgId: input.orgId, acceptedAt: null },
  })
  if (existing) throw new Error("A pending invite already exists for this email")

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invite = await db.invite.create({
    data: {
      token: randomUUID(),
      email,
      role: input.role,
      orgId: input.orgId,
      unitId: input.unitId ?? null,
      sentById: session.user.id,
      expiresAt,
    },
  })

  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account/invites")
  return invite
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

  const invite = await createInviteForOrg({ email, role: role as Role, orgId: session.user.orgId, unitId })
  return invite.token
}

// CSV/paste bulk-invite for Owners, matched to existing units by number -
// tolerant of bad rows (skips and reports them individually) rather than
// failing the whole batch, since a 100-row import realistically always has
// a few typos or units not yet on file.
export async function bulkInviteOwners(rows: { unitNumber: string; email: string }[]) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")
  const orgId = session.user.orgId

  const units = await db.unit.findMany({ where: { orgId }, select: { id: true, number: true } })
  const unitByNumber = new Map(units.map((u) => [u.number.trim().toLowerCase(), u.id]))

  const pendingInvites = await db.invite.findMany({
    where: { orgId, acceptedAt: null },
    select: { email: true },
  })
  const alreadyInvited = new Set(pendingInvites.map((i) => i.email))

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const seenInBatch = new Set<string>()
  const toCreate: { token: string; email: string; unitId: string }[] = []
  const skippedNoUnit: string[] = []
  const skippedInvalidEmail: string[] = []
  const skippedDuplicate: string[] = []

  for (const row of rows) {
    const unitNumber = row.unitNumber.trim()
    const email = row.email.trim().toLowerCase()
    const unitId = unitByNumber.get(unitNumber.toLowerCase())

    if (!unitId) {
      skippedNoUnit.push(unitNumber)
      continue
    }
    if (!email || !emailRe.test(email)) {
      skippedInvalidEmail.push(unitNumber)
      continue
    }
    if (alreadyInvited.has(email) || seenInBatch.has(email)) {
      skippedDuplicate.push(email)
      continue
    }
    seenInBatch.add(email)
    toCreate.push({ token: randomUUID(), email, unitId })
  }

  if (toCreate.length > 0) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await db.invite.createMany({
      data: toCreate.map((r) => ({
        token: r.token,
        email: r.email,
        role: "OWNER" as Role,
        orgId,
        unitId: r.unitId,
        sentById: session.user.id,
        expiresAt,
      })),
    })
  }

  revalidatePath("/dashboard/account")
  return {
    created: toCreate.length,
    skippedNoUnit,
    skippedInvalidEmail,
    skippedDuplicate,
  }
}

export async function revokeInvite(inviteId: string) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  await db.invite.delete({ where: { id: inviteId, orgId: session.user.orgId } })
  revalidatePath("/dashboard/account/invites")
}
