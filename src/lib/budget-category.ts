import { BudgetCategory } from "@/generated/prisma"

export const budgetCategoryLabel: Record<BudgetCategory, string> = {
  UTILITIES: "Utilities",
  PAYROLL: "Payroll",
  GROUNDS: "Grounds & Landscaping",
  MAINTENANCE: "Maintenance & Repairs",
  SECURITY: "Security",
  INSURANCE: "Insurance",
  ADMIN: "Administration",
  TAXES_AND_FEES: "Taxes & Government Fees",
  RESERVE_CONTRIBUTION: "Reserve Contribution",
  CAPITAL_EXPENSE: "Capital Expense",
  OTHER: "Other",
}

// Display order for the picker (the editor itself orders groups by total).
export const BUDGET_CATEGORIES: BudgetCategory[] = [
  "UTILITIES",
  "PAYROLL",
  "GROUNDS",
  "MAINTENANCE",
  "SECURITY",
  "INSURANCE",
  "ADMIN",
  "TAXES_AND_FEES",
  "RESERVE_CONTRIBUTION",
  "CAPITAL_EXPENSE",
  "OTHER",
]

export function parseBudgetCategory(v: unknown): BudgetCategory | null {
  return typeof v === "string" && (BUDGET_CATEGORIES as string[]).includes(v) ? (v as BudgetCategory) : null
}

// Best-effort keyword mapping for a free-text section/label from an
// imported budget ("Water", "Payroll tax", "Landscaping contract").
const CATEGORY_KEYWORDS: [BudgetCategory, RegExp][] = [
  ["UTILITIES", /electric|water|propane|\bgas\b|utilit|sewer|internet|telephone|phone|power|waste|garbage|trash|refuse|recycl/i],
  ["PAYROLL", /payroll|wage|salar|employee|social security|imss|sat isr|isr\b|vacation|christmas|bonus|aguinaldo|uniform/i],
  ["GROUNDS", /landscap|garden|lawn|mower|irrigation|palm|tree|grounds|pool/i],
  ["MAINTENANCE", /maintenance|repair|building|equipment|fumigat|pest|paint|elevator|fire protection/i],
  ["SECURITY", /security|guard|surveillance|camera/i],
  ["INSURANCE", /insurance/i],
  ["ADMIN", /manag[e]?ment fee|\badmin|bank com+is+ion|bank com+is+ión|bank fee|legal|lawyer|account|audit|office|postage|software|contingenc/i],
  ["TAXES_AND_FEES", /\btax|government fee|permit|licen[cs]e|concession|fine|registration/i],
  ["RESERVE_CONTRIBUTION", /reserve|capital contribution|sinking fund/i],
  ["CAPITAL_EXPENSE", /capital ?ex(p|penditure)|capex|capital project|capital improvement/i],
]

export function guessBudgetCategory(text: string | null | undefined): BudgetCategory | null {
  if (!text) return null
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat
  return null
}
