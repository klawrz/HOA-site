"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteOwnerExpense } from "@/app/actions/owner-expenses"
import { downloadCsv } from "@/lib/csv"
import { formatDateISO } from "@/lib/utils"
import { ExpenseCategory } from "@/generated/prisma"
import { NewExpenseDialog } from "./new-expense-dialog"

const categoryLabel: Record<ExpenseCategory, string> = {
  RECURRING: "Recurring",
  DUES: "Dues",
  MAINTENANCE: "Maintenance",
  CAPITAL: "Capital",
  CLEANING: "Cleaning",
  OTHER: "Other",
}

interface ExpenseRow {
  id: string
  category: ExpenseCategory
  amount: number
  date: Date
  description: string
  notes: string | null
  unit: { number: string; building: string | null }
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function ExpenseLogPanel({
  expenses,
  units,
  unitLabel,
}: {
  expenses: ExpenseRow[]
  units: { id: string; number: string; building: string | null }[]
  unitLabel: string
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const thisYear = new Date().getFullYear()

  async function handleRemove(id: string) {
    setBusyId(id)
    const result = await deleteOwnerExpense(id)
    setBusyId(null)
    if (!result.success) toast.error("Failed to remove entry")
  }

  function handleExport() {
    const rows: (string | number)[][] = [["Date", "Category", unitLabel, "Description", "Amount", "Notes"]]
    for (const e of expenses) {
      rows.push([
        formatDateISO(e.date),
        categoryLabel[e.category],
        `${unitLabel} ${e.unit.number}${e.unit.building ? ` - Building ${e.unit.building}` : ""}`,
        e.description,
        e.amount,
        e.notes ?? "",
      ])
    }
    downloadCsv(`expenses-${thisYear}.csv`, rows)
  }

  const yearExpenses = expenses.filter((e) => e.date.getFullYear() === thisYear)
  const yearTotal = yearExpenses.reduce((s, e) => s + e.amount, 0)
  const byCategory = (Object.keys(categoryLabel) as ExpenseCategory[])
    .map((c) => ({ category: c, total: yearExpenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter((c) => c.total > 0)

  const sorted = [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-gray-500">Total logged in {thisYear}</p>
          <p className="text-2xl font-bold">{money(yearTotal)}</p>
          {byCategory.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {byCategory.map((c) => `${categoryLabel[c.category]}: ${money(c.total)}`).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={expenses.length === 0}>
            <Download className="h-3.5 w-3.5" /> Download CSV
          </Button>
          <NewExpenseDialog units={units} unitLabel={unitLabel} />
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400">No expenses logged yet.</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((e) => (
            <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{money(e.amount)}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                    {categoryLabel[e.category]}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateISO(e.date)}</span>
                  <span className="text-xs text-gray-400">
                    {unitLabel} {e.unit.number}{e.unit.building && ` — Building ${e.unit.building}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {e.description}
                  {e.notes && <span className="text-gray-400"> · {e.notes}</span>}
                </p>
              </div>
              <button
                onClick={() => handleRemove(e.id)}
                disabled={busyId === e.id}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0 ml-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
