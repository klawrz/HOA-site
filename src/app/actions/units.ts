"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { RentalPolicy, UnitStatus } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

export async function updateRentalPolicy(
  ownershipId: string,
  unitId: string,
  policy: RentalPolicy,
  notes: string
) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const ownership = await db.unitOwnership.findFirst({
    where: { id: ownershipId, ownerId: session.user.id, isCurrent: true },
  })
  if (!ownership) return { success: false }

  // Derive the unit status from the policy - any policy other than
  // NOT_RENTING means the owner is open to renting it out.
  let unitStatus: UnitStatus | undefined
  const hasActiveLease = await db.lease.findFirst({
    where: { unitId, isActive: true },
  })
  if (!hasActiveLease) {
    unitStatus = policy === "NOT_RENTING" ? "OWNER_OCCUPIED" : "AVAILABLE"
  }

  await db.unitOwnership.update({
    where: { id: ownershipId },
    data: { rentalPolicy: policy, notes: notes || null },
  })

  if (unitStatus) {
    await db.unit.update({ where: { id: unitId }, data: { status: unitStatus } })
  }

  revalidatePath("/dashboard/owner")
  revalidatePath("/dashboard/property-manager")
  revalidatePath("/dashboard/property-manager/units")
  return { success: true }
}
