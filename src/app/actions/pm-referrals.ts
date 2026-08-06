"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"

export async function submitPMReferral(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "PROPERTY_MANAGER") {
    throw new Error("Unauthorized")
  }

  const propertyName = (formData.get("propertyName") as string)?.trim()
  if (!propertyName) throw new Error("Property name is required")

  const org = await db.organization.findUnique({
    where: { id: session.user.orgId },
    select: { name: true },
  })

  const estimatedUnitsRaw = formData.get("estimatedUnits") as string
  await db.pMReferral.create({
    data: {
      orgId: session.user.orgId,
      orgName: org?.name ?? "",
      referredById: session.user.id,
      referredByName: session.user.name ?? "",
      referredByEmail: session.user.email ?? "",
      propertyName,
      estimatedUnits: estimatedUnitsRaw ? Number(estimatedUnitsRaw) : null,
      contactName: (formData.get("contactName") as string)?.trim() || null,
      contactEmail: (formData.get("contactEmail") as string)?.trim() || null,
      contactPhone: (formData.get("contactPhone") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
    },
  })
  revalidatePath("/dashboard/property-manager")
}

export async function markPMReferralStatus(
  referralId: string,
  status: "CONTACTED" | "CONVERTED" | "DECLINED"
) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  await db.pMReferral.update({ where: { id: referralId }, data: { status } })
  revalidatePath("/platform-admin/referrals")
}

// Called once the New Organization wizard successfully creates an org that
// was started from this referral, so the lead list reflects it closed the
// loop rather than staying NEW/CONTACTED forever.
export async function convertPMReferral(referralId: string, orgId: string) {
  const session = await requirePlatformAdmin()
  if (!session) throw new Error("Unauthorized")

  await db.pMReferral.update({
    where: { id: referralId },
    data: { status: "CONVERTED", convertedOrgId: orgId },
  })
  revalidatePath("/platform-admin/referrals")
}
