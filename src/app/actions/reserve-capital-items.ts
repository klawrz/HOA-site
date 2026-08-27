"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/occupancy"

function canManageReserveFund(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

function revalidateReservePaths() {
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board/finances/reserve")
  revalidatePath("/dashboard/board/finances/reserve")
  revalidatePath("/dashboard/property-manager/finances/reserve")
}

export async function createReserveCapitalItem(data: {
  name: string
  lastDone: string
  lifeExpectancyYears: number
  estimatedCost: number | null
  notes: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const name = data.name.trim()
  if (!name) return { success: false, error: "Item name required" }
  if (!data.lifeExpectancyYears || data.lifeExpectancyYears <= 0) {
    return { success: false, error: "Life expectancy must be greater than zero" }
  }
  if (data.estimatedCost != null && data.estimatedCost < 0) {
    return { success: false, error: "Estimated cost can't be negative" }
  }

  await db.reserveCapitalItem.create({
    data: {
      orgId: session.user.orgId,
      name,
      lastDone: parseDateOnly(data.lastDone),
      lifeExpectancyYears: data.lifeExpectancyYears,
      estimatedCost: data.estimatedCost,
      notes: data.notes.trim() || null,
      createdById: session.user.id,
    },
  })

  revalidateReservePaths()
  return { success: true }
}

export async function updateReserveCapitalItem(
  id: string,
  data: {
    name: string
    lastDone: string
    lifeExpectancyYears: number
    estimatedCost: number | null
    notes: string
  }
) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const item = await db.reserveCapitalItem.findUnique({ where: { id } })
  if (!item || item.orgId !== session.user.orgId) return { success: false }

  const name = data.name.trim()
  if (!name) return { success: false, error: "Item name required" }
  if (!data.lifeExpectancyYears || data.lifeExpectancyYears <= 0) {
    return { success: false, error: "Life expectancy must be greater than zero" }
  }
  if (data.estimatedCost != null && data.estimatedCost < 0) {
    return { success: false, error: "Estimated cost can't be negative" }
  }

  await db.reserveCapitalItem.update({
    where: { id },
    data: {
      name,
      lastDone: parseDateOnly(data.lastDone),
      lifeExpectancyYears: data.lifeExpectancyYears,
      estimatedCost: data.estimatedCost,
      notes: data.notes.trim() || null,
    },
  })

  revalidateReservePaths()
  return { success: true }
}

export async function deleteReserveCapitalItem(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const item = await db.reserveCapitalItem.findUnique({ where: { id } })
  if (!item || item.orgId !== session.user.orgId) return { success: false }

  await db.reserveCapitalItem.delete({ where: { id } })
  revalidateReservePaths()
  return { success: true }
}
