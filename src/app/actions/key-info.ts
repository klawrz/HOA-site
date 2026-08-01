"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { KeyContactCategory } from "@/generated/prisma"

function canManageKeyInfo(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

function revalidateKeyInfoPaths() {
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board/key-info")
  revalidatePath("/dashboard/board/key-info")
  revalidatePath("/dashboard/property-manager/key-info")
}

export async function setBankInfo(data: {
  bankName: string
  bankAccountName: string
  bankSigningAuthority: string
  bankPaymentInstructions: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageKeyInfo(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  await db.organization.update({
    where: { id: session.user.orgId },
    data: {
      bankName: data.bankName.trim() || null,
      bankAccountName: data.bankAccountName.trim() || null,
      bankSigningAuthority: data.bankSigningAuthority.trim() || null,
      bankPaymentInstructions: data.bankPaymentInstructions.trim() || null,
    },
  })

  revalidateKeyInfoPaths()
  return { success: true }
}

export async function setOccupancyPolicy(policy: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageKeyInfo(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  await db.organization.update({
    where: { id: session.user.orgId },
    data: { occupancyVisibilityPolicy: policy.trim() || null },
  })

  revalidateKeyInfoPaths()
  return { success: true }
}

export async function setRentalPoolGuidelines(guidelines: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageKeyInfo(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  await db.organization.update({
    where: { id: session.user.orgId },
    data: { rentalPoolGuidelines: guidelines.trim() || null },
  })

  revalidateKeyInfoPaths()
  revalidatePath("/dashboard/owner/rental-pool")
  return { success: true }
}

export async function createKeyContact(data: {
  category: KeyContactCategory
  name: string
  role?: string
  phone?: string
  email?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageKeyInfo(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const name = data.name.trim()
  if (!name) return { success: false, error: "Name required" }

  const count = await db.keyContact.count({ where: { orgId: session.user.orgId } })

  await db.keyContact.create({
    data: {
      orgId: session.user.orgId,
      category: data.category,
      name,
      role: data.role?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
      sortOrder: count,
    },
  })

  revalidateKeyInfoPaths()
  return { success: true }
}

export async function updateKeyContact(
  id: string,
  data: {
    category: KeyContactCategory
    name: string
    role?: string
    phone?: string
    email?: string
    notes?: string
  }
) {
  const session = await auth()
  if (!session?.user.orgId || !canManageKeyInfo(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const contact = await db.keyContact.findUnique({ where: { id } })
  if (!contact || contact.orgId !== session.user.orgId) return { success: false }

  const name = data.name.trim()
  if (!name) return { success: false, error: "Name required" }

  await db.keyContact.update({
    where: { id },
    data: {
      category: data.category,
      name,
      role: data.role?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  })

  revalidateKeyInfoPaths()
  return { success: true }
}

export async function deleteKeyContact(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageKeyInfo(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const contact = await db.keyContact.findUnique({ where: { id } })
  if (!contact || contact.orgId !== session.user.orgId) return { success: false }

  await db.keyContact.delete({ where: { id } })

  revalidateKeyInfoPaths()
  return { success: true }
}
