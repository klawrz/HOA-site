"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { UnitManagerArea } from "@/generated/prisma"

export async function updateUnitManagerProfile(data: {
  company?: string
  headline?: string
  bio?: string
  phone?: string
  yearsExperience?: number
  specialties: UnitManagerArea[]
  directoryVisible: boolean
}) {
  const session = await auth()
  if (!session || session.user.role !== "UNIT_MANAGER") return { success: false }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      company: data.company?.trim() || null,
      headline: data.headline?.trim() || null,
      bio: data.bio?.trim() || null,
      phone: data.phone?.trim() || null,
      yearsExperience: data.yearsExperience ?? null,
      specialties: data.specialties.join(",") || null,
      directoryVisible: data.directoryVisible,
    },
  })

  revalidatePath("/dashboard/unit-manager/profile")
  return { success: true }
}
