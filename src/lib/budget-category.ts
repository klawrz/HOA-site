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
  "OTHER",
]

export function parseBudgetCategory(v: unknown): BudgetCategory | null {
  return typeof v === "string" && (BUDGET_CATEGORIES as string[]).includes(v) ? (v as BudgetCategory) : null
}

// Best-effort keyword mapping for a free-text section/label from an
// imported budget ("Water", "Payroll tax", "Landscaping contract").
const CATEGORY_KEYWORDS: [BudgetCategory, RegExp][] = [
  ["UTILITIES", /electric|water|propane|gas|utilit|sewer|internet|telephone|phone|power/i],
  ["PAYROLL", /payroll|wage|salar|employee|social security|imss|sat isr|vacation pay|christmas pay|bonus|aguinaldo/i],
  ["GROUNDS", /landscap|garden|lawn|mower|irrigation|palm|tree|grounds|pool/i],
  ["MAINTENANCE", /maintenance|repair|building|equipment|fumigat|pest|paint|elevator/i],
  ["SECURITY", /security|guard|surveillance|camera/i],
  ["INSURANCE", /insurance/i],
  ["ADMIN", /management fee|admin|bank commission|bank fee|legal|lawyer|account|audit|office|postage|software/i],
  ["TAXES_AND_FEES", /tax|government fee|permit|licen[cs]e|concession|fine|registration/i],
  ["RESERVE_CONTRIBUTION", /reserve|capital contribution|sinking fund/i],
]

export function guessBudgetCategory(text: string | null | undefined): BudgetCategory | null {
  if (!text) return null
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat
  return null
}
