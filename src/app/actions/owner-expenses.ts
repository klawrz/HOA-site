"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ExpenseCategory } from "@/generated/prisma"

function revalidateExpensePaths() {
  revalidatePath("/dashboard/owner/financial/expenses")
  revalidatePath("/dashboard/owner")
}

async function requireCurrentOwner(unitId: string, userId: string) {
  return db.unitOwnership.findFirst({ where: { unitId, ownerId: userId, isCurrent: true } })
}

export async function createOwnerExpense(data: {
  unitId: string
  category: ExpenseCategory
  amount: number
  date: string
  description: string
  notes?: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }
  if (!(await requireCurrentOwner(data.unitId, session.user.id))) return { success: false }
  if (!data.description.trim() || !(data.amount > 0)) {
    return { success: false, error: "A description and a positive amount are required" }
  }

  await db.ownerExpense.create({
    data: {
      unitId: data.unitId,
      ownerId: session.user.id,
      category: data.category,
      amount: data.amount,
      date: new Date(data.date),
      description: data.description.trim(),
      notes: data.notes || null,
    },
  })

  revalidateExpensePaths()
  return { success: true }
}

// Checks ownerId directly, not current ownership - a past owner can still
// manage their own historical entries after selling the unit.
export async function deleteOwnerExpense(id: string) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }

  const expense = await db.ownerExpense.findUnique({ where: { id } })
  if (!expense || expense.ownerId !== session.user.id) return { success: false }

  await db.ownerExpense.delete({ where: { id } })

  revalidateExpensePaths()
  return { success: true }
}
