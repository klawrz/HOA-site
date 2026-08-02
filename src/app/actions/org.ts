"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

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

  const trimmed = name.trim()
  if (!trimmed) throw new Error("Label is required")

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

export async function updateOrgAddress(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") throw new Error("Unauthorized")

  await db.organization.update({
    where: { id: session.user.orgId },
    data: {
      addressLine1: (formData.get("addressLine1") as string) || null,
      addressLine2: (formData.get("addressLine2") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      postalCode: (formData.get("postalCode") as string) || null,
      country: (formData.get("country") as string) || null,
    },
  })
  revalidatePath("/dashboard/account")
  revalidatePath("/")
}

// Scoped to safe, non-structural fields - role and email carry logic
// elsewhere (unit ownership, login identity) that a simple edit form
// shouldn't touch.
export async function updateMemberContactInfo(
  memberId: string,
  data: { name?: string; phone?: string }
) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  const membership = await db.membership.findFirst({ where: { userId: memberId, orgId: session.user.orgId } })
  if (!membership) return { success: false }

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

export async function completeOnboarding() {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  await db.organization.update({
    where: { id: session.user.orgId },
    data: { onboardingComplete: true },
  })
  revalidatePath("/dashboard")
}
