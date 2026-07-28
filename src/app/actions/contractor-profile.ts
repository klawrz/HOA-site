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

// Adds a contractor as a directory entry so they can be picked when
// creating a contract right away - no password, so no portal login yet.
// Many vendors (utilities, garbage, insurance) never need one; those that
// do can still be sent a proper invite later from Members, which will
// prompt them to set a password without disturbing this record.
export async function createContractorRecord(data: {
  name: string
  email: string
  company?: string
  phone?: string
  category?: ContractorCategory
}) {
  const session = await auth()
  if (!session) return { success: false }
  if (!["ACCOUNT_OWNER", "BOARD_MEMBER", "PROPERTY_MANAGER", "OWNER"].includes(session.user.role)) {
    return { success: false }
  }

  const existing = await db.user.findUnique({ where: { email: data.email } })
  if (existing) {
    if (existing.role !== "CONTRACTOR") {
      return { success: false, error: "An account with this email already exists" }
    }
    return { success: true, contractor: existing }
  }

  const contractor = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: "CONTRACTOR",
      company: data.company || null,
      phone: data.phone || null,
      category: data.category || null,
    },
  })

  revalidatePath("/dashboard/property-manager/contractors")
  return { success: true, contractor }
}
