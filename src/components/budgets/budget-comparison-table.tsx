"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { downloadCsv } from "@/lib/csv"

interface ComparisonLineItem {
  label: string
  budgetedAmount: number
  actualAmount: number | null
}

interface ComparisonBudget {
  id: string
  year: number
  version: string
  status: string
  lineItems: ComparisonLineItem[]
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function BudgetComparisonTable({ budgets }: { budgets: ComparisonBudget[] }) {
  const sorted = [...budgets].sort((a, b) => a.year - b.year)

  if (sorted.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">No budgets yet to compare.</p>
  }

  // Preserve the order labels first appear across years, oldest budget
  // first - HOAs tend to keep the same category order year to year, so
  // this naturally matches the org's own consistent format rather than
  // re-sorting it alphabetically.
  const labels: string[] = []
  for (const b of sorted) {
    for (const item of b.lineItems) {
      if (!labels.includes(item.label)) labels.push(item.label)
    }
  }

  function cellFor(budget: ComparisonBudget, label: string) {
    return budget.lineItems.find((i) => i.label === label) ?? null
  }

  function totalFor(budget: ComparisonBudget) {
    return budget.lineItems.reduce((s, i) => s + i.budgetedAmount, 0)
  }

  function handleExport() {
    const header = ["Line Item", ...sorted.map((b) => `${b.year} ${b.version} (Budgeted)`), ...sorted.map((b) => `${b.year} ${b.version} (Actual)`)]
    const rows: (string | number)[][] = [header]
    for (const label of labels) {
      const budgetedCells = sorted.map((b) => cellFor(b, label)?.budgetedAmount ?? "")
      const actualCells = sorted.map((b) => cellFor(b, label)?.actualAmount ?? "")
      rows.push([label, ...budgetedCells, ...actualCells])
    }
    rows.push(["Total", ...sorted.map((b) => totalFor(b)), ...sorted.map(() => "")])
    downloadCsv(`budget-comparison-${sorted.map((b) => b.year).join("-")}.csv`, rows)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>
      <Card className="py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="text-left font-medium px-3 py-2">Line Item</th>
                {sorted.map((b) => (
                  <th key={b.id} className="text-right font-medium px-3 py-2">
                    <div>{b.year}</div>
                    <div className="font-normal text-gray-400">{b.version}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {labels.map((label) => (
                <tr key={label}>
                  <td className="px-3 py-2">{label}</td>
                  {sorted.map((b) => {
                    const item = cellFor(b, label)
                    return (
                      <td key={b.id} className="text-right px-3 py-2 tabular-nums">
                        {item ? (
                          <>
                            {money(item.budgetedAmount)}
                            {item.actualAmount != null && (
                              <div className="text-xs text-gray-400">actual {money(item.actualAmount)}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="px-3 py-2">Total</td>
                {sorted.map((b) => (
                  <td key={b.id} className="text-right px-3 py-2 tabular-nums">
                    {money(totalFor(b))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
