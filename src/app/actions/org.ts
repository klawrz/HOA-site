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

export async function completeOnboarding() {
  const session = await auth()
  if (!session?.user.orgId) throw new Error("Unauthorized")
  await db.organization.update({
    where: { id: session.user.orgId },
    data: { onboardingComplete: true },
  })
  revalidatePath("/dashboard")
}
