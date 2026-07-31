"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, Download, FileStack } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineItemDialog } from "./line-item-dialog"
import { ApproveBudgetDialog } from "./approve-budget-dialog"
import { ImportCsvDialog } from "./import-csv-dialog"
import { deleteLineItem, revertBudgetToDraft, deleteBudget, saveBudgetAsTemplate } from "@/app/actions/budgets"
import { formatDateISO } from "@/lib/utils"
import { downloadCsv } from "@/lib/csv"

interface ContractOption {
  id: string
  title: string
  amount: number | null
  billingPeriod: string | null
}

interface MeetingOption {
  id: string
  title: string
  date: Date
}

interface LineItem {
  id: string
  label: string
  budgetedAmount: number
  actualAmount: number | null
  previousYearActual: number | null
  contractId: string | null
  contractTitle: string | null
}

interface BudgetData {
  id: string
  year: number
  version: string
  status: string
  notes: string | null
  approvedAt: Date | null
  meetingTitle: string | null
  lineItems: LineItem[]
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function BudgetEditor({
  budget,
  contracts,
  meetings,
  canManage,
  canApprove,
  onDeletedHref,
}: {
  budget: BudgetData
  contracts: ContractOption[]
  meetings: MeetingOption[]
  canManage: boolean
  canApprove: boolean
  onDeletedHref?: string
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deletingBudget, setDeletingBudget] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)

  async function handleRemoveItem(id: string) {
    setRemovingId(id)
    const result = await deleteLineItem(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove line item")
  }

  async function handleRevert() {
    const result = await revertBudgetToDraft(budget.id)
    if (!result.success) toast.error("Failed to revert to draft")
  }

  async function handleDeleteBudget() {
    setDeletingBudget(true)
    const result = await deleteBudget(budget.id)
    setDeletingBudget(false)
    if (result.success && onDeletedHref) {
      window.location.href = onDeletedHref
    } else if (!result.success) {
      toast.error("Failed to delete budget")
    }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true)
    const result = await saveBudgetAsTemplate(budget.id)
    setSavingTemplate(false)
    if (result.success) {
      toast.success("Saved to Document Repository")
    } else {
      toast.error(result.error || "Failed to save template")
    }
  }

  function handleExport() {
    const rows: (string | number)[][] = [["Line Item", "Budgeted", "Actual", "Variance", "Prior Year Actual"]]
    for (const item of budget.lineItems) {
      const variance = item.actualAmount != null ? item.actualAmount - item.budgetedAmount : ""
      rows.push([
        item.label,
        item.budgetedAmount,
        item.actualAmount ?? "",
        variance,
        item.previousYearActual ?? "",
      ])
    }
    downloadCsv(`budget-${budget.year}-${budget.version.toLowerCase().replace(/\s+/g, "-")}.csv`, rows)
  }

  const totals = budget.lineItems.reduce(
    (acc, i) => {
      acc.budgeted += i.budgetedAmount
      if (i.actualAmount != null) {
        acc.actual += i.actualAmount
        // Only the budgeted amount for items that also have an actual
        // recorded - comparing a partial actual against the FULL budget
        // total would produce a misleading variance while the year is
        // still in progress and not every line item has closed out yet.
        acc.budgetedForItemsWithActual += i.budgetedAmount
        acc.hasActual = true
      }
      acc.previousYear += i.previousYearActual ?? 0
      acc.hasPreviousYear = acc.hasPreviousYear || i.previousYearActual != null
      return acc
    },
    { budgeted: 0, actual: 0, budgetedForItemsWithActual: 0, hasActual: false, previousYear: 0, hasPreviousYear: false }
  )
  const totalVariance = totals.hasActual ? totals.actual - totals.budgetedForItemsWithActual : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">
              {budget.year} — {budget.version}
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                budget.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {budget.status === "APPROVED" ? "Approved" : "Draft"}
            </span>
          </div>
          {budget.status === "APPROVED" && budget.approvedAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Approved {formatDateISO(budget.approvedAt)}
              {budget.meetingTitle && ` at ${budget.meetingTitle}`}
            </p>
          )}
          {budget.notes && <p className="text-sm text-gray-600 mt-1">{budget.notes}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          {canManage && (
            <Button size="sm" variant="outline" onClick={handleSaveTemplate} disabled={savingTemplate} className="gap-1.5">
              <FileStack className="h-3.5 w-3.5" /> {savingTemplate ? "Saving..." : "Save as Template"}
            </Button>
          )}
          {canApprove && (
            <>
              {budget.status === "DRAFT" ? (
                <ApproveBudgetDialog budgetId={budget.id} meetings={meetings} />
              ) : (
                <Button size="sm" variant="outline" onClick={handleRevert}>
                  Revert to Draft
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={handleDeleteBudget}
                disabled={deletingBudget}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="text-left font-medium px-3 py-2">Line Item</th>
                <th className="text-right font-medium px-3 py-2">Budgeted</th>
                <th className="text-right font-medium px-3 py-2">Actual</th>
                <th className="text-right font-medium px-3 py-2">Variance</th>
                <th className="text-right font-medium px-3 py-2">Prior Year</th>
                {canManage && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {budget.lineItems.map((item) => {
                const variance = item.actualAmount != null ? item.actualAmount - item.budgetedAmount : null
                return (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.label}</p>
                      {item.contractTitle && (
                        <p className="text-xs text-gray-400">from contract: {item.contractTitle}</p>
                      )}
                    </td>
                    <td className="text-right px-3 py-2 tabular-nums">{money(item.budgetedAmount)}</td>
                    <td className="text-right px-3 py-2 tabular-nums">
                      {item.actualAmount != null ? money(item.actualAmount) : "—"}
                    </td>
                    <td
                      className={`text-right px-3 py-2 tabular-nums ${
                        variance == null ? "" : variance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {variance != null ? `${variance > 0 ? "+" : ""}${money(variance)}` : "—"}
                    </td>
                    <td className="text-right px-3 py-2 tabular-nums text-gray-500">
                      {item.previousYearActual != null ? money(item.previousYearActual) : "—"}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          <LineItemDialog budgetId={budget.id} contracts={contracts} item={item} />
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removingId === item.id}
                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {budget.lineItems.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-3 py-8 text-center text-gray-400">
                    No line items yet.
                  </td>
                </tr>
              )}
            </tbody>
            {budget.lineItems.length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="text-right px-3 py-2 tabular-nums">{money(totals.budgeted)}</td>
                  <td className="text-right px-3 py-2 tabular-nums">{totals.hasActual ? money(totals.actual) : "—"}</td>
                  <td
                    className={`text-right px-3 py-2 tabular-nums ${
                      totalVariance == null ? "" : totalVariance > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {totalVariance != null ? `${totalVariance > 0 ? "+" : ""}${money(totalVariance)}` : "—"}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums text-gray-500">
                    {totals.hasPreviousYear ? money(totals.previousYear) : "—"}
                  </td>
                  {canManage && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {canManage && budget.lineItems.length < 50 && (
        <div className="flex gap-2">
          <LineItemDialog budgetId={budget.id} contracts={contracts} />
          <ImportCsvDialog budgetId={budget.id} />
        </div>
      )}
    </div>
  )
}
