"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { ContractorCategory } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

export async function updateContractorProfile(data: {
  company?: string
  phone?: string
  category?: ContractorCategory
}) {
  const session = await auth()
  if (!session || session.user.role !== "CONTRACTOR") return { success: false }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      company: data.company || null,
      phone: data.phone || null,
      category: data.category || null,
    },
  })

  revalidatePath("/dashboard/contractor")
  revalidatePath("/dashboard/property-manager/contractors")
  return { success: true }
}
