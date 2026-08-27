"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { slugify } from "@/lib/slugify"
import { Prisma } from "@/generated/prisma"

export async function addUnit(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const number = formData.get("number") as string
  if (!number?.trim()) throw new Error("Unit number required")

  const existing = await db.unit.findFirst({ where: { orgId: session.user.orgId, number: number.trim() } })
  if (existing) throw new Error(`A unit numbered "${number.trim()}" already exists`)

  await db.unit.create({
    data: {
      orgId: session.user.orgId,
      number: number.trim(),
      building: (formData.get("building") as string) || null,
      bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
      bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
      sqft: formData.get("sqft") ? Number(formData.get("sqft")) : null,
      civicRoll: (formData.get("civicRoll") as string) || null,
      status: "AVAILABLE",
    },
  })
  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account/units")
}

// The custodian setting up the org is often also its first real unit
// owner - this lets them become both in one step, during onboarding,
// rather than adding the unit now and separately assigning themselves as
// its owner later via the Units page. Mirrors addUnit's field parsing, but
// also links a UnitOwnership directly to the caller (no email lookup
// needed - assignUnitOwner's approach - since the owner is the session
// itself). This is what makes them "the first custodian plus the first
// registered owner" - see requireOwnerAccess for the access this unlocks.
export async function claimOwnUnit(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const number = formData.get("number") as string
  if (!number?.trim()) throw new Error("Unit number required")
  const trimmed = number.trim()

  const existing = await db.unit.findFirst({
    where: { orgId: session.user.orgId, number: trimmed },
    include: { ownerships: { where: { isCurrent: true } } },
  })

  // A unit already on file (e.g. pre-populated via document import or added
  // manually earlier) isn't a conflict - claim ownership of that same unit
  // instead of trying to create a second one with the same number. Only a
  // genuine conflict - someone else already owns it - stays an error.
  if (existing) {
    if (existing.ownerships.length > 0) {
      throw new Error(`Unit "${trimmed}" already has an owner on file`)
    }
    await db.$transaction(async (tx) => {
      await tx.unitOwnership.create({ data: { unitId: existing.id, ownerId: session.user.id } })
      await tx.unit.update({ where: { id: existing.id }, data: { status: "OWNER_OCCUPIED" } })
    })
    revalidatePath("/onboarding")
    revalidatePath("/dashboard/account/units")
    revalidatePath("/dashboard/owner")
    return { id: existing.id, number: existing.number }
  }

  const unit = await db.$transaction(async (tx) => {
    const unit = await tx.unit.create({
      data: {
        orgId: session.user.orgId!,
        number: trimmed,
        building: (formData.get("building") as string) || null,
        bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
        bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
        status: "OWNER_OCCUPIED",
      },
    })
    await tx.unitOwnership.create({ data: { unitId: unit.id, ownerId: session.user.id } })
    return unit
  })

  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account/units")
  revalidatePath("/dashboard/owner")
  return { id: unit.id, number: unit.number }
}

// Lets an existing Account Owner spin up a second, fully independent
// organization under their own login - e.g. colocated properties that are
// legally distinct HOAs ("Sampaguita I"/"II"/"III"). Deliberately the
// opposite posture from signUpNewOrg's EMAIL_EXISTS rejection: there the
// email is a stranger's until proven otherwise (anonymous public form), but
// here the caller is already an authenticated Account Owner, so reusing
// their own identity for a new org is exactly the point - mirrors
// createOrganizationWithOwner's existing-user branch (platform-admin.ts),
// minus the admin gate, since this only ever acts on the caller's own
// account. Starts PROVISIONAL (schema default) - self-service, not
// platform-admin-vouched.
export async function createSiblingOrg(newOrgName: string) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")

  const name = newOrgName.trim()
  if (!name) throw new Error("Organization name is required")

  const sourceOrg = await db.organization.findUnique({
    where: { id: session.user.orgId },
    select: { unitLabel: true },
  })

  try {
    const org = await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name, slug: slugify(name), unitLabel: sourceOrg?.unitLabel ?? "Unit" },
      })
      await tx.membership.create({ data: { userId: session.user.id, orgId: org.id, role: "ACCOUNT_OWNER" } })
      return org
    })
    revalidatePath("/dashboard")
    return { orgId: org.id, orgName: org.name }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("An organization with a very similar name already exists - try a slightly different name.")
    }
    throw err
  }
}

// One or many units generated client-side (by-floor generator or a pasted
// list) in a single submit - the whole reason for this to exist is 50-unit
// HOAs, so it must tolerate re-running over an overlapping range rather
// than erroring the entire batch out.
export async function bulkAddUnits(units: { number: string; floor?: number; building?: string }[]) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  const orgId = session.user.orgId

  const cleaned = units
    .map((u) => ({ ...u, number: u.number.trim() }))
    .filter((u) => u.number.length > 0)
  if (cleaned.length === 0) return { success: true, created: 0, skipped: [] as string[] }

  const existing = await db.unit.findMany({ where: { orgId }, select: { number: true } })
  const existingNumbers = new Set(existing.map((u) => u.number))

  const seen = new Set<string>()
  const toCreate: typeof cleaned = []
  const skipped: string[] = []
  for (const u of cleaned) {
    if (existingNumbers.has(u.number) || seen.has(u.number)) {
      skipped.push(u.number)
      continue
    }
    seen.add(u.number)
    toCreate.push(u)
  }

  if (toCreate.length > 0) {
    await db.unit.createMany({
      data: toCreate.map((u) => ({
        orgId,
        number: u.number,
        floor: u.floor ?? null,
        building: u.building || null,
        status: "AVAILABLE",
      })),
    })
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account/units")
  return { success: true, created: toCreate.length, skipped }
}

export async function updateUnit(unitId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const unit = await db.unit.findUnique({ where: { id: unitId } })
  if (!unit || unit.orgId !== session.user.orgId) throw new Error("Unauthorized")

  const number = (formData.get("number") as string)?.trim()
  if (!number) throw new Error("Unit number required")

  if (number !== unit.number) {
    const duplicate = await db.unit.findFirst({ where: { orgId: session.user.orgId, number } })
    if (duplicate) throw new Error(`A unit numbered "${number}" already exists`)
  }

  await db.unit.update({
    where: { id: unitId },
    data: {
      number,
      building: (formData.get("building") as string) || null,
      floor: formData.get("floor") ? Number(formData.get("floor")) : null,
      bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
      bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
      sqft: formData.get("sqft") ? Number(formData.get("sqft")) : null,
      description: (formData.get("description") as string) || null,
      civicRoll: (formData.get("civicRoll") as string) || null,
    },
  })
  revalidatePath("/dashboard/account/units")
}

export async function updateUnitLabel(name: string) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")

  // Blank is a valid choice - units then just show as bare numbers ("101"),
  // no "Unit"/"Villa"/"Apt." prefix at all.
  const trimmed = name.trim()

  await db.organization.update({ where: { id: session.user.orgId }, data: { unitLabel: trimmed } })
  revalidatePath("/dashboard/account/units")
}

export async function deleteUnit(unitId: string) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  await db.unit.delete({ where: { id: unitId, orgId: session.user.orgId } })
  revalidatePath("/onboarding")
  revalidatePath("/dashboard/account/units")
}

// Records a unit's owner of record directly, without waiting for an invite
// to be sent and accepted - useful for entering known owners upfront (e.g.
// importing an existing roster). If the email doesn't match an existing
// User, a passwordless placeholder account is created; they get real portal
// access later via a normal invite (accepting it just adds their
// Membership - the ownership record here is reused rather than duplicated).
export async function assignUnitOwner(unitId: string, data: { name: string; email: string }) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const unit = await db.unit.findUnique({ where: { id: unitId } })
  if (!unit || unit.orgId !== session.user.orgId) throw new Error("Unauthorized")

  const email = data.email.trim().toLowerCase()
  const name = data.name.trim()
  if (!email) throw new Error("Email required")

  await db.$transaction(async (tx) => {
    let owner = await tx.user.findUnique({ where: { email } })
    if (!owner) {
      owner = await tx.user.create({ data: { name: name || null, email } })
    } else if (name && name !== owner.name) {
      // A name typed into this form is a deliberate edit (fixing a typo,
      // filling in a placeholder) - always apply it, not just when the
      // record had no name yet. Blank input leaves whatever name is on
      // file untouched rather than clobbering it.
      owner = await tx.user.update({ where: { id: owner.id }, data: { name } })
    }

    const currentOwnership = await tx.unitOwnership.findFirst({ where: { unitId, isCurrent: true } })
    if (currentOwnership?.ownerId === owner.id) {
      // Same owner already on this unit (just correcting their name/email
      // record) - nothing to transfer, avoid piling up a fresh ownership
      // row for every edit.
      return
    }

    await tx.unitOwnership.updateMany({
      where: { unitId, isCurrent: true },
      data: { isCurrent: false, divestedAt: new Date() },
    })
    await tx.unitOwnership.create({ data: { unitId, ownerId: owner.id } })
    await tx.unit.update({ where: { id: unitId }, data: { status: "OWNER_OCCUPIED" } })
  })

  revalidatePath("/dashboard/account/units")
}

export async function clearUnitOwner(unitId: string) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const unit = await db.unit.findUnique({ where: { id: unitId } })
  if (!unit || unit.orgId !== session.user.orgId) throw new Error("Unauthorized")

  await db.unitOwnership.updateMany({
    where: { unitId, isCurrent: true },
    data: { isCurrent: false, divestedAt: new Date() },
  })
  if (unit.status === "OWNER_OCCUPIED") {
    await db.unit.update({ where: { id: unitId }, data: { status: "AVAILABLE" } })
  }
  revalidatePath("/dashboard/account/units")
}

export async function updateOrgAddress(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")

  const boardApprovalRaw = formData.get("boardApprovalStatus") as string
  const boardApprovalStatus = boardApprovalRaw === "BOARD_APPROVED" ? "BOARD_APPROVED" : "NOT_YET_DECIDED"

  await db.organization.update({
    where: { id: session.user.orgId },
    data: {
      addressLine1: (formData.get("addressLine1") as string) || null,
      addressLine2: (formData.get("addressLine2") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      postalCode: (formData.get("postalCode") as string) || null,
      country: (formData.get("country") as string) || null,
      legalEntityName: (formData.get("legalEntityName") as string)?.trim() || null,
      boardApprovalStatus,
    },
  })
  revalidatePath("/dashboard/account")
  revalidatePath("/")
}

// Self-service twin of platform-admin's updateOrgBillingProfile, minus the
// accountNumber/pricingPlan/billingExpiry/paymentMethod fields - those stay
// HOPE's own internal billing record, not something a customer edits
// themselves. Only writes fields present in the FormData for the same
// reason as the platform-admin version: this card and any future caller
// posting a different subset of these fields must not stomp each other.
export async function updateOrgAccountHolderData(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")

  const str = (name: string) => (formData.get(name) as string)?.trim() || null
  const data: Record<string, string | null> = {}

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

  await db.organization.update({ where: { id: session.user.orgId }, data })
  revalidatePath("/dashboard/account")
}

// Scoped to safe, non-structural fields - role and email carry logic
// elsewhere (unit ownership, login identity) that a simple edit form
// shouldn't touch.
// True for anyone with a real stake in this org - a portal Membership, a
// current unit ownership, or a Board seat - matching getOrgPeople's notion
// of "member". A placeholder person recorded directly (no Membership yet)
// still needs their name/phone editable here, not just re-typed through
// the unit/board-position dialogs that created them.
async function hasOrgAssociation(userId: string, orgId: string) {
  const [membership, ownership, boardPosition] = await Promise.all([
    db.membership.findFirst({ where: { userId, orgId } }),
    db.unitOwnership.findFirst({ where: { ownerId: userId, isCurrent: true, unit: { orgId } } }),
    db.boardPosition.findFirst({ where: { userId, orgId } }),
  ])
  return !!(membership || ownership || boardPosition)
}

export async function updateMemberContactInfo(
  memberId: string,
  data: { name?: string; phone?: string }
) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  if (!(await hasOrgAssociation(memberId, session.user.orgId))) return { success: false }

  await db.user.update({
    where: { id: memberId },
    data: {
      name: data.name || null,
      phone: data.phone || null,
    },
  })

  revalidatePath("/dashboard/account/members")
  revalidatePath(`/dashboard/account/members/${memberId}`)
  return { success: true }
}

// Grants Board governance capability (meetings, documents) independent of
// the member's primary role - see isBoardMember on User in schema.prisma.
export async function setBoardMember(memberId: string, isBoardMember: boolean) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  const membership = await db.membership.findFirst({ where: { userId: memberId, orgId: session.user.orgId } })
  if (!membership) return { success: false }

  await db.membership.update({
    where: { userId_orgId: { userId: memberId, orgId: session.user.orgId } },
    data: { isBoardMember },
  })

  revalidatePath("/dashboard/account/members")
  revalidatePath(`/dashboard/account/members/${memberId}`)
  return { success: true }
}

// "Onboarded" means: at least one unit exists, and at least one unit owner
// is on record - invited (need not be accepted yet), staged on the pending
// roster (see PendingOwner in schema.prisma - added so the custodian can
// finish setup without being forced to send real invites right away), or
// self-claimed. A single-unit self-managed owner satisfies this by claiming
// their own unit, so this doesn't force anyone to have a multi-unit HOA
// before HOPE considers them set up.
export async function completeOnboarding() {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  const orgId = session.user.orgId

  const [unitCount, ownerInviteCount, pendingOwnerCount, selfOwnedCount] = await Promise.all([
    db.unit.count({ where: { orgId } }),
    db.invite.count({ where: { orgId, role: "OWNER" } }),
    db.pendingOwner.count({ where: { orgId } }),
    db.unitOwnership.count({ where: { unit: { orgId }, isCurrent: true } }),
  ])
  if (unitCount === 0) throw new Error("Add at least one unit before finishing setup")
  // A custodian who claimed their own unit (claimOwnUnit) is a confirmed
  // owner on record already - more definitively than a pending unaccepted
  // invite - so either satisfies this requirement.
  if (ownerInviteCount === 0 && pendingOwnerCount === 0 && selfOwnedCount === 0) {
    throw new Error("Add at least one unit owner before finishing setup")
  }

  await db.organization.update({
    where: { id: orgId },
    data: { onboardingComplete: true },
  })
  revalidatePath("/dashboard")
}
