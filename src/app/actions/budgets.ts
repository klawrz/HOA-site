"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { BudgetType } from "@/generated/prisma"
import { parseCsv, findColumn, parseMoney } from "@/lib/csv-parse"
import { saveUploadedFile } from "@/lib/file-upload"

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

export async function createBudget(data: {
  year: number
  version: string
  type?: BudgetType
  notes?: string
  cloneFromBudgetId?: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  let sourceLineItems: { label: string; budgetedAmount: number; actualAmount: number | null; sortOrder: number }[] = []
  if (data.cloneFromBudgetId) {
    const source = await db.budget.findUnique({
      where: { id: data.cloneFromBudgetId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    })
    if (!source || source.orgId !== session.user.orgId) return { success: false, error: "Source budget not found" }
    sourceLineItems = source.lineItems
  }

  const budget = await db.budget.create({
    data: {
      orgId: session.user.orgId,
      year: data.year,
      version: data.version.trim() || "Draft",
      type: data.type ?? "OPERATING",
      notes: data.notes || null,
      createdById: session.user.id,
      // Same format each year is the point: labels and last year's amount
      // carry over as a starting point to adjust, rather than retyping
      // ~20 line items from scratch. previousYearActual comes from the
      // source's own actual where it closed out the year, falling back to
      // what it was budgeted if no actual was ever recorded.
      lineItems: {
        create: sourceLineItems.map((i) => ({
          label: i.label,
          budgetedAmount: i.budgetedAmount,
          previousYearActual: i.actualAmount ?? i.budgetedAmount,
          sortOrder: i.sortOrder,
        })),
      },
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

// Accepts CSV only (see src/lib/csv-parse.ts for why, not .xlsx) - expects
// headers naming a label and a budgeted-amount column at minimum, with
// actual/prior-year columns optional. Flexible about naming since a real
// accountant's export won't match our own column names exactly.
export async function importBudgetLineItemsFromCsv(budgetId: string, csvText: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const budget = await db.budget.findUnique({ where: { id: budgetId } })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }

  const rows = parseCsv(csvText)
  if (rows.length < 2) return { success: false, error: "No data rows found in file" }

  const [header, ...dataRows] = rows
  const labelIdx = findColumn(header, ["line item", "label", "category", "description", "item"])
  const budgetedIdx = findColumn(header, ["budgeted", "budget", "amount", "proposed", "budgeted amount"])
  const actualIdx = findColumn(header, ["actual", "actual amount"])
  const priorIdx = findColumn(header, [
    "prior year actual",
    "prior year",
    "previous year",
    "previous year actual",
    "last year actual",
    "last year",
  ])

  if (labelIdx === -1 || budgetedIdx === -1) {
    return {
      success: false,
      error: 'Could not find the line item and budgeted-amount columns - expected headers like "Line Item" and "Budgeted"',
    }
  }

  const existingCount = await db.budgetLineItem.count({ where: { budgetId } })

  const items = dataRows
    .map((row, i) => ({
      label: row[labelIdx]?.trim() ?? "",
      budgetedAmount: parseMoney(row[budgetedIdx]),
      actualAmount: actualIdx !== -1 ? parseMoney(row[actualIdx]) : null,
      previousYearActual: priorIdx !== -1 ? parseMoney(row[priorIdx]) : null,
      sortOrder: existingCount + i,
    }))
    // Skip blank rows and a trailing "Total" row - both common in a
    // real exported spreadsheet and neither is a real line item.
    .filter((item) => item.label && item.label.toLowerCase() !== "total" && item.budgetedAmount != null)

  if (items.length === 0) {
    return { success: false, error: "No usable rows found - check the file has a label and a budgeted amount per row" }
  }

  if (existingCount + items.length > 50) {
    return {
      success: false,
      error: `Would exceed the 50 line item limit (${existingCount} existing + ${items.length} in file)`,
    }
  }

  await db.budgetLineItem.createMany({
    data: items.map((i) => ({
      budgetId,
      label: i.label,
      budgetedAmount: i.budgetedAmount!,
      actualAmount: i.actualAmount,
      previousYearActual: i.previousYearActual,
      sortOrder: i.sortOrder,
    })),
  })

  revalidateBudgetPaths()
  return { success: true, count: items.length }
}

// Exports the budget as a CSV and files it in the Document repository, so
// it's discoverable the same way Bylaws/Contracts are and can be reused as
// next year's starting format even outside HOPE (e.g. handed to an
// accountant who doesn't use the app).
export async function saveBudgetAsTemplate(budgetId: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const budget = await db.budget.findUnique({
    where: { id: budgetId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }

  const escape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const lines = [
    ["Line Item", "Budgeted", "Actual", "Prior Year Actual"].join(","),
    ...budget.lineItems.map((i) =>
      [escape(i.label), i.budgetedAmount, i.actualAmount ?? "", i.previousYearActual ?? ""].join(",")
    ),
  ]
  const csv = lines.join("\n")

  const filename = `${budget.year}-${budget.version.toLowerCase().replace(/\s+/g, "-")}-budget-template.csv`
  const file = new File([csv], filename, { type: "text/csv" })
  const uploaded = await saveUploadedFile(file, "documents")
  if (!uploaded.success) return { success: false, error: uploaded.error }

  await db.document.create({
    data: {
      orgId: session.user.orgId,
      title: `${budget.year} ${budget.version} Budget Template`,
      category: "FINANCIAL",
      visibility: "OWNERS",
      description: `Exported line items from the ${budget.year} ${budget.version} budget, for reuse when preparing next year's.`,
      fileUrl: uploaded.url,
      uploadedById: session.user.id,
    },
  })

  revalidateBudgetPaths()
  revalidatePath("/dashboard/board/documents")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  revalidatePath("/dashboard/property-manager/documents")
  return { success: true }
}
