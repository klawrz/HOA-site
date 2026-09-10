import { DuesFrequency } from "@/generated/prisma"
import { db } from "@/lib/db"
import { DUES_FREQUENCY_PER_YEAR } from "@/lib/dues"

// The operating budget that owner-facing figures should be worked from.
// Prefer an APPROVED operating budget; if the Board has only a proposed
// (DRAFT) one, fall back to that so owners still see an anticipated dues
// figure rather than a blank page - the caller is expected to label it
// "anticipated / proposed". Budgets with no line items (empty scaffolds)
// are ignored. Amounts are normalised to USD using the budget's own
// exchange rate when it is stated in pesos, matching how the Association's
// reports present figures.
export interface EffectiveBudget {
  id: string
  year: number
  label: string | null
  version: string
  isProposed: boolean
  currency: "USD" | "MXN"
  exchangeRate: number | null
  totalNative: number
  totalUsd: number
}

const USD_PER_MXN_FALLBACK = 17.5

export async function getEffectiveOperatingBudget(
  orgId: string | null | undefined,
): Promise<EffectiveBudget | null> {
  if (!orgId) return null

  const budgets = await db.budget.findMany({
    where: { orgId, type: "OPERATING" },
    include: { lineItems: { select: { budgetedAmount: true } } },
    orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
  })

  const withLines = budgets.filter((b) => b.lineItems.length > 0)
  if (withLines.length === 0) return null

  const chosen =
    withLines.find((b) => b.status === "APPROVED") ?? withLines[0]

  const totalNative = chosen.lineItems.reduce((s, li) => s + li.budgetedAmount, 0)
  const currency = chosen.currency === "MXN" ? "MXN" : "USD"
  const rate = chosen.exchangeRate ?? (currency === "MXN" ? USD_PER_MXN_FALLBACK : null)
  const totalUsd = currency === "MXN" ? totalNative / (rate ?? USD_PER_MXN_FALLBACK) : totalNative

  return {
    id: chosen.id,
    year: chosen.year,
    label: chosen.periodLabel,
    version: chosen.version,
    isProposed: chosen.status !== "APPROVED",
    currency,
    exchangeRate: rate,
    totalNative,
    totalUsd,
  }
}

export interface DuesInstalment {
  label: string
  dueDate: Date
  amount: number
}

// Split an annual dues figure into its instalments, each carrying a due
// date. No fiscal-year start is stored on a budget, so instalments fall on
// the first day of each calendar period of `year` (Jan 1 / Apr 1 / Jul 1 /
// Oct 1 for quarterly). Callers should present these as "anticipated".
export function duesInstalments(
  annual: number,
  frequency: DuesFrequency,
  year: number,
): DuesInstalment[] {
  const perYear = DUES_FREQUENCY_PER_YEAR[frequency]
  const monthsEach = 12 / perYear

  // Whole-dollar instalments that sum exactly to the rounded annual total -
  // the extra cents go on the earliest instalments.
  const totalRounded = Math.round(annual)
  const base = Math.floor(totalRounded / perYear)
  const remainder = totalRounded - base * perYear

  const label = (i: number) => {
    if (frequency === "QUARTERLY") return `Q${i + 1} ${year}`
    if (frequency === "SEMI_ANNUAL") return `${i === 0 ? "First" : "Second"} half ${year}`
    return `${year}`
  }

  // UTC-midnight, matching how date-only values (assessment due dates etc.)
  // are stored - callers format these with toISOString().slice(0,10), not
  // the locale-reading formatDateISO.
  return Array.from({ length: perYear }, (_, i) => ({
    label: label(i),
    dueDate: new Date(Date.UTC(year, Math.round(i * monthsEach), 1)),
    amount: base + (i < remainder ? 1 : 0),
  }))
}
