"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { BudgetType } from "@/generated/prisma"

// Drafting/entering numbers is common ground for the Board and the PM (who
// often prepares the budget for Board review). Formal approval - "the
// budget gets approved at the AGM" - is a Board governance act, so PM
// alone can't flip a budget to APPROVED.
function canManageBudget(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

function canApproveBudget(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || isBoardMember
}

function revalidateBudgetPaths() {
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  revalidatePath("/dashboard/owner/financial")
  revalidatePath("/dashboard/board/finances")
  revalidatePath("/dashboard/property-manager/finances")
  revalidatePath("/dashboard/account/units")
}

export async function createBudget(data: { year: number; version: string; type?: BudgetType; notes?: string }) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const budget = await db.budget.create({
    data: {
      orgId: session.user.orgId,
      year: data.year,
      version: data.version.trim() || "Draft",
      type: data.type ?? "OPERATING",
      notes: data.notes || null,
      createdById: session.user.id,
    },
  })

  revalidateBudgetPaths()
  return { success: true, id: budget.id }
}

export async function deleteBudget(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const budget = await db.budget.findUnique({ where: { id } })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }

  await db.budget.delete({ where: { id } })

  revalidateBudgetPaths()
  return { success: true }
}

export async function approveBudget(id: string, meetingId?: string) {
  const session = await auth()
  if (!session?.user.orgId || !canApproveBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const budget = await db.budget.findUnique({ where: { id } })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }

  await db.budget.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), meetingId: meetingId || null },
  })

  revalidateBudgetPaths()
  return { success: true }
}

export async function revertBudgetToDraft(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canApproveBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const budget = await db.budget.findUnique({ where: { id } })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }

  await db.budget.update({
    where: { id },
    data: { status: "DRAFT", approvedAt: null, meetingId: null },
  })

  revalidateBudgetPaths()
  return { success: true }
}

export async function createLineItem(
  budgetId: string,
  data: {
    label: string
    budgetedAmount: number
    actualAmount?: number
    previousYearActual?: number
    contractId?: string
  }
) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const budget = await db.budget.findUnique({ where: { id: budgetId } })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }

  const label = data.label.trim()
  if (!label) return { success: false, error: "Label required" }

  const count = await db.budgetLineItem.count({ where: { budgetId } })
  if (count >= 50) return { success: false, error: "Budgets are limited to 50 line items" }

  await db.budgetLineItem.create({
    data: {
      budgetId,
      label,
      budgetedAmount: data.budgetedAmount,
      actualAmount: data.actualAmount ?? null,
      previousYearActual: data.previousYearActual ?? null,
      contractId: data.contractId || null,
      sortOrder: count,
    },
  })

  revalidateBudgetPaths()
  return { success: true }
}

export async function updateLineItem(
  id: string,
  data: {
    label: string
    budgetedAmount: number
    actualAmount?: number
    previousYearActual?: number
    contractId?: string
  }
) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const item = await db.budgetLineItem.findUnique({ where: { id }, include: { budget: true } })
  if (!item || item.budget.orgId !== session.user.orgId) return { success: false }

  const label = data.label.trim()
  if (!label) return { success: false, error: "Label required" }

  await db.budgetLineItem.update({
    where: { id },
    data: {
      label,
      budgetedAmount: data.budgetedAmount,
      actualAmount: data.actualAmount ?? null,
      previousYearActual: data.previousYearActual ?? null,
      contractId: data.contractId || null,
    },
  })

  revalidateBudgetPaths()
  return { success: true }
}

export async function deleteLineItem(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const item = await db.budgetLineItem.findUnique({ where: { id }, include: { budget: true } })
  if (!item || item.budget.orgId !== session.user.orgId) return { success: false }

  await db.budgetLineItem.delete({ where: { id } })

  revalidateBudgetPaths()
  return { success: true }
}

export async function setUnitAllocation(unitId: string, percent: number | null) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }
  if (
    session.user.role !== "ACCOUNT_OWNER" &&
    !canManageBudget(session.user.role, session.user.isBoardMember)
  ) {
    return { success: false }
  }

  const unit = await db.unit.findUnique({ where: { id: unitId } })
  if (!unit || unit.orgId !== session.user.orgId) return { success: false }

  await db.unit.update({ where: { id: unitId }, data: { allocationPercent: percent } })

  revalidateBudgetPaths()
  return { success: true }
}
