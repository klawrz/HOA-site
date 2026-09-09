"use server"

import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { BudgetType, Currency } from "@/generated/prisma"
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
  periodLabel?: string
  version: string
  currency?: Currency
  exchangeRate?: number | null
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
      periodLabel: data.periodLabel?.trim() || null,
      version: data.version.trim() || "Draft",
      currency: data.currency ?? "USD",
      exchangeRate: typeof data.exchangeRate === "number" && data.exchangeRate > 0 ? data.exchangeRate : null,
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

  const org = await db.organization.findUnique({ where: { id: session.user.orgId } })

  await db.budget.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      meetingId: meetingId || null,
      // Freeze whichever rate this budget was using - its own if set,
      // otherwise the org's live rate at approval time.
      approvalExchangeRate: budget.exchangeRate ?? org?.currentExchangeRate ?? null,
    },
  })

  revalidateBudgetPaths()
  return { success: true }
}

// Edit the proposal metadata (period, currency, rate, revision, version)
// on a DRAFT budget. Once APPROVED these are frozen - use revert first.
export async function setBudgetMeta(
  id: string,
  data: {
    year?: number
    periodLabel?: string | null
    version?: string
    currency?: Currency
    exchangeRate?: number | null
  }
) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  const budget = await db.budget.findUnique({ where: { id } })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }
  if (budget.status === "APPROVED") return { success: false, error: "Revert the budget to draft before changing this." }

  await db.budget.update({
    where: { id },
    data: {
      ...(data.year && Number.isFinite(data.year) ? { year: Math.round(data.year) } : {}),
      ...(data.periodLabel !== undefined ? { periodLabel: data.periodLabel?.trim() || null } : {}),
      ...(data.version !== undefined ? { version: data.version.trim() || "Draft" } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      ...(data.exchangeRate !== undefined
        ? { exchangeRate: typeof data.exchangeRate === "number" && data.exchangeRate > 0 ? data.exchangeRate : null }
        : {}),
    },
  })
  revalidateBudgetPaths()
  return { success: true }
}

// Bump the revision number - "we changed things, this is Rev N+1".
export async function reviseBudget(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  const budget = await db.budget.findUnique({ where: { id } })
  if (!budget || budget.orgId !== session.user.orgId) return { success: false }
  if (budget.status === "APPROVED") return { success: false, error: "Revert to draft before revising." }

  await db.budget.update({
    where: { id },
    data: { revision: budget.revision + 1, version: budget.version === "Draft" ? "Revised" : budget.version },
  })
  revalidateBudgetPaths()
  return { success: true, revision: budget.revision + 1 }
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
    data: { status: "DRAFT", approvedAt: null, meetingId: null, approvalExchangeRate: null },
  })

  revalidateBudgetPaths()
  return { success: true }
}

// Manually maintained (no external FX API) - the Board/PM updates this
// whenever convenient. Budgeted figures lock to whatever this was at
// approval time (see approveBudget); actual figures always convert using
// the current value, live, whenever the report is viewed.
export async function setExchangeRate(rate: number, baseCurrency?: Currency) {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  if (!(rate > 0)) return { success: false, error: "Rate must be a positive number" }

  await db.organization.update({
    where: { id: session.user.orgId },
    data: {
      currentExchangeRate: rate,
      exchangeRateUpdatedAt: new Date(),
      ...(baseCurrency ? { baseCurrency } : {}),
    },
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

// --- Draft a budget from an uploaded financial document -------------------
// Read a prior-year budget / financial statement PDF (or image) and create
// a DRAFT "Proposed" operating budget from it, for the Board/PM to review
// and adjust. Same AI-extraction shape as extractContractFromFile in
// contracts.ts. Nothing is approved - a DRAFT budget has no authority.

const BUDGET_EXTRACT_WINDOW_MS = 10 * 60 * 1000
const BUDGET_EXTRACT_MAX = 10
const budgetExtractLog = new Map<string, number[]>()
function checkBudgetExtractRateLimit(userId: string): boolean {
  const now = Date.now()
  const recent = (budgetExtractLog.get(userId) ?? []).filter((t) => now - t < BUDGET_EXTRACT_WINDOW_MS)
  if (recent.length >= BUDGET_EXTRACT_MAX) {
    budgetExtractLog.set(userId, recent)
    return false
  }
  recent.push(now)
  budgetExtractLog.set(userId, recent)
  return true
}

const BUDGET_DRAFT_TOOL = {
  name: "provide_budget_draft",
  description: "Record the operating-budget line items read from the document, as a proposed budget to review.",
  input_schema: {
    type: "object" as const,
    properties: {
      fiscalYear: { type: "number", description: "The year the NEW proposed budget is for. If the document is last year's, this is the following year." },
      currency: { type: "string", enum: ["USD", "MXN"], description: "The currency the amounts in the document are stated in." },
      lineItems: {
        type: "array",
        description: "One entry per operating expense/revenue line in the document. Skip subtotal and grand-total rows.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "The line item name exactly as written." },
            budgetedAmount: { type: "number", description: "Proposed amount for the new year. Use the document's stated proposed/next-year figure if it has one; otherwise carry the prior-year actual forward unchanged." },
            priorYearAmount: { type: ["number", "null"], description: "The prior year's actual (or budgeted, if no actual) for this line, else null." },
          },
          required: ["label", "budgetedAmount"],
        },
      },
      assumptions: { type: "string", description: "1-3 sentences: what you carried forward, any line you couldn't read a number for, and any total that didn't reconcile." },
    },
    required: ["fiscalYear", "currency", "lineItems", "assumptions"],
  },
}

interface BudgetDraftExtract {
  fiscalYear: number
  currency: "USD" | "MXN"
  lineItems: { label: string; budgetedAmount: number; priorYearAmount?: number | null }[]
  assumptions: string
}

export async function draftBudgetFromFile(
  formData: FormData
): Promise<{ success: true; id: string; count: number; assumptions: string } | { success: false; error: string }> {
  const session = await auth()
  if (!session?.user.orgId || !canManageBudget(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "You don't have permission to draft budgets." }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { success: false, error: "Document reading isn't set up yet - create the budget and paste a CSV instead." }
  if (!checkBudgetExtractRateLimit(session.user.id)) {
    return { success: false, error: "Too many uploads in a short time - please wait a few minutes." }
  }

  const uploaded = formData.get("file")
  if (!(uploaded instanceof File) || uploaded.size === 0) return { success: false, error: "Choose a file first." }
  const mimeType = uploaded.type
  const supportedType =
    mimeType === "application/pdf" ? "document" : mimeType === "image/png" || mimeType === "image/jpeg" ? "image" : null
  if (!supportedType) return { success: false, error: "Only PDF, PNG, or JPG files can be read automatically." }

  const yearOverride = formData.get("year") ? Number(formData.get("year")) : null
  const periodLabel = (formData.get("periodLabel") as string)?.trim() || null
  const currencyOverride = formData.get("currency") === "MXN" || formData.get("currency") === "USD"
    ? (formData.get("currency") as Currency)
    : null
  const rateOverride = formData.get("exchangeRate") ? Number(formData.get("exchangeRate")) : null

  const base64 = Buffer.from(await uploaded.arrayBuffer()).toString("base64")
  const anthropic = new Anthropic({ apiKey, timeout: 60_000 })

  let extract: BudgetDraftExtract
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system:
        "You read an HOA/condo operating budget or annual financial statement and turn it into a proposed operating budget for the next fiscal year, to be reviewed by the Board. Extract every operating line item. For each, set budgetedAmount to the document's proposed/next-year figure if it states one, otherwise carry the prior-year actual forward unchanged - do not invent increases. Record the prior-year amount in priorYearAmount. Skip subtotals and totals. Call provide_budget_draft once with your best reading. Amounts are plain numbers, no currency symbols.",
      tools: [BUDGET_DRAFT_TOOL],
      tool_choice: { type: "tool", name: "provide_budget_draft" },
      messages: [
        {
          role: "user",
          content: [
            { type: supportedType, source: { type: "base64", media_type: mimeType, data: base64 } } as
              | Anthropic.DocumentBlockParam
              | Anthropic.ImageBlockParam,
            { type: "text", text: "Draft next year's operating budget from this document." },
          ],
        },
      ],
    })
    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "provide_budget_draft"
    )
    if (!toolUse) return { success: false, error: "Couldn't read a budget from that document - try a clearer file or paste a CSV." }
    extract = toolUse.input as BudgetDraftExtract
  } catch (err) {
    console.error("[draftBudgetFromFile] extraction failed:", err instanceof Error ? err.message : err)
    return { success: false, error: "The document reader hit a problem - try again, or create the budget and paste a CSV." }
  }

  const items = (Array.isArray(extract.lineItems) ? extract.lineItems : [])
    .map((i, idx) => ({
      label: String(i.label ?? "").trim(),
      budgetedAmount: typeof i.budgetedAmount === "number" ? i.budgetedAmount : NaN,
      previousYearActual: typeof i.priorYearAmount === "number" ? i.priorYearAmount : null,
      sortOrder: idx,
    }))
    .filter((i) => i.label && i.label.toLowerCase() !== "total" && Number.isFinite(i.budgetedAmount))
    .slice(0, 50)

  if (items.length === 0) {
    return { success: false, error: "No usable line items were found in that document." }
  }

  const year = Number.isFinite(yearOverride) && yearOverride ? yearOverride : Math.round(extract.fiscalYear) || new Date().getFullYear() + 1
  const assumptions = String(extract.assumptions ?? "").trim()

  const docCurrency = extract.currency === "MXN" || extract.currency === "USD" ? extract.currency : null
  const currency: Currency = currencyOverride ?? docCurrency ?? "USD"
  const currencyNote =
    currencyOverride && docCurrency && currencyOverride !== docCurrency
      ? `\n\n⚠ You set the currency to ${currencyOverride} but the document appears to be in ${docCurrency} - the amounts were NOT converted, they were kept as-is. Check the figures.`
      : ""

  const budget = await db.budget.create({
    data: {
      orgId: session.user.orgId,
      year,
      periodLabel,
      version: "Proposed",
      currency,
      exchangeRate: rateOverride && rateOverride > 0 ? rateOverride : null,
      type: "OPERATING",
      status: "DRAFT",
      notes: `Drafted by HOPE from an uploaded document (${uploaded.name}) on ${new Date().toISOString().slice(0, 10)}. Amounts as read: ${currency}. Review every line before approving.${currencyNote}${assumptions ? `\n\nReader's notes: ${assumptions}` : ""}`,
      createdById: session.user.id,
      lineItems: {
        create: items.map((i) => ({
          label: i.label,
          budgetedAmount: i.budgetedAmount,
          previousYearActual: i.previousYearActual,
          sortOrder: i.sortOrder,
        })),
      },
    },
  })

  revalidateBudgetPaths()
  return { success: true, id: budget.id, count: items.length, assumptions }
}
