import type { BudgetCategory } from "@/generated/prisma"
import { guessBudgetCategory } from "@/lib/budget-category"

// A flat budget hides which lines are really one spend area. "Keeping the
// grounds green", for instance, is the GROUNDS category *plus* the crew's
// payroll *plus* the water used for irrigation - three categories that move
// together. This module rolls the budget up into those cross-category
// clusters and flags any that dominate the total, which is hard to see by
// eye and is the natural place a Board looks first for savings.

export interface BudgetLine {
  category: BudgetCategory | null
  label: string
  budgetedAmount: number
}

export interface SpendCluster {
  id: string
  label: string
  // Whole categories that always belong to the cluster.
  categories: BudgetCategory[]
  // Lines in these categories are added only when their label matches -
  // e.g. just the "water" line out of UTILITIES.
  partial?: { category: BudgetCategory; labelPattern: RegExp }[]
  note: string
}

// The default lenses. Clusters may overlap (a landscaping contract counts
// toward both "grounds upkeep" and "outsourced contracts") - each is a
// separate way of looking at the same budget.
export const DEFAULT_SPEND_CLUSTERS: SpendCluster[] = [
  {
    id: "grounds-upkeep",
    label: "Grounds, gardening labour & irrigation",
    categories: ["GROUNDS", "PAYROLL"],
    partial: [{ category: "UTILITIES", labelPattern: /water|irrig/i }],
    note: "Landscaping, the grounds and maintenance crew's wages and statutory costs, and the water used to irrigate.",
  },
  {
    id: "outsourced-contracts",
    label: "Outsourced contracts (management, security, landscaping)",
    categories: [],
    partial: [
      { category: "ADMIN", labelPattern: /manage/i },
      { category: "SECURITY", labelPattern: /./ },
      { category: "GROUNDS", labelPattern: /contract/i },
    ],
    note: "The largest recurring contracts with outside providers.",
  },
]

export interface ClusterResult {
  id: string
  label: string
  amount: number
  pct: number // 0-100, share of the whole budget
  note: string
}

export interface SpendConcentration {
  total: number
  clusters: ClusterResult[] // non-empty clusters, largest share first
}

function lineCategory(l: BudgetLine): BudgetCategory | null {
  return l.category ?? guessBudgetCategory(l.label)
}

export function analyzeSpendConcentration(
  lines: BudgetLine[],
  clusters: SpendCluster[] = DEFAULT_SPEND_CLUSTERS,
): SpendConcentration {
  const total = lines.reduce((s, l) => s + l.budgetedAmount, 0)

  const results: ClusterResult[] = clusters.map((c) => {
    const amount = lines.reduce((s, l) => {
      const cat = lineCategory(l)
      if (!cat) return s
      if (c.categories.includes(cat)) return s + l.budgetedAmount
      const hit = c.partial?.some((p) => p.category === cat && p.labelPattern.test(l.label))
      return hit ? s + l.budgetedAmount : s
    }, 0)
    return {
      id: c.id,
      label: c.label,
      note: c.note,
      amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }
  })

  return {
    total,
    clusters: results.filter((r) => r.amount > 0).sort((a, b) => b.pct - a.pct),
  }
}

// Share of the budget at which a cluster is worth flagging to the Board.
export const CLUSTER_FLAG_PCT = 33
export const CLUSTER_WARN_PCT = 42
