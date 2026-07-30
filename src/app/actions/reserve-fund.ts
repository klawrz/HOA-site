"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ReserveTransactionType } from "@/generated/prisma"
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

export async function setReserveTarget(amount: number | null) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  if (amount != null && amount < 0) return { success: false, error: "Target can't be negative" }

  await db.organization.update({
    where: { id: session.user.orgId },
    data: { reserveTarget: amount },
  })

  revalidateReservePaths()
  return { success: true }
}

export async function createReserveTransaction(data: {
  type: ReserveTransactionType
  amount: number
  date: string
  description: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const description = data.description.trim()
  if (!description) return { success: false, error: "Description required" }
  if (!data.amount || data.amount <= 0) return { success: false, error: "Amount must be greater than zero" }

  await db.reserveTransaction.create({
    data: {
      orgId: session.user.orgId,
      type: data.type,
      amount: data.amount,
      date: parseDateOnly(data.date),
      description,
      createdById: session.user.id,
    },
  })

  revalidateReservePaths()
  return { success: true }
}

export async function deleteReserveTransaction(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const transaction = await db.reserveTransaction.findUnique({ where: { id } })
  if (!transaction || transaction.orgId !== session.user.orgId) return { success: false }

  await db.reserveTransaction.delete({ where: { id } })
  revalidateReservePaths()
  return { success: true }
}
