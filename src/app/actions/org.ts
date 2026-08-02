"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function addUnit(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")

  const number = formData.get("number") as string
  if (!number?.trim()) throw new Error("Unit number required")

  await db.unit.create({
    data: {
      orgId: session.user.orgId,
      number: number.trim(),
      building: (formData.get("building") as string) || null,
      bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : null,
      bathrooms: formData.get("bathrooms") ? Number(formData.get("bathrooms")) : null,
      sqft: formData.get("sqft") ? Number(formData.get("sqft")) : null,
      addressLine1: (formData.get("addressLine1") as string) || null,
      addressLine2: (formData.get("addressLine2") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      postalCode: (formData.get("postalCode") as string) || null,
      country: (formData.get("country") as string) || null,
      civicRoll: (formData.get("civicRoll") as string) || null,
      status: "AVAILABLE",
    },
  })
  revalidatePath("/onboarding")
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
