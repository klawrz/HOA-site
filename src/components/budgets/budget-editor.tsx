"use client"

import { Fragment, useState } from "react"
import { toast } from "sonner"
import { Trash2, Download, FileStack, ChevronDown, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineItemDialog } from "./line-item-dialog"
import { ApproveBudgetDialog } from "./approve-budget-dialog"
import { ImportCsvDialog } from "./import-csv-dialog"
import { ExchangeRateBar } from "./exchange-rate-bar"
import { deleteLineItem, revertBudgetToDraft, deleteBudget, saveBudgetAsTemplate, reviseBudget } from "@/app/actions/budgets"
import { BudgetMetaDialog } from "./budget-meta-dialog"
import { formatDateISO } from "@/lib/utils"
import { downloadCsv } from "@/lib/csv"
import { convertToSecondary, secondaryCurrency, formatMoney } from "@/lib/currency"
import { budgetCategoryLabel } from "@/lib/budget-category"
import { Currency, BudgetCategory } from "@/generated/prisma"

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
  category: BudgetCategory | null
  budgetedAmount: number
  actualAmount: number | null
  previousYearActual: number | null
  contractId: string | null
  contractTitle: string | null
}

const GROUP_NONE = "__none__"

interface BudgetData {
  id: string
  year: number
  periodLabel: string | null
  revision: number
  version: string
  currency: Currency
  exchangeRate: number | null
  status: string
  notes: string | null
  approvedAt: Date | null
  approvalExchangeRate: number | null
  meetingTitle: string | null
  lineItems: LineItem[]
}

export function BudgetEditor({
  budget,
  contracts,
  meetings,
  canManage,
  canApprove,
  onDeletedHref,
  baseCurrency = "USD",
  currentExchangeRate = null,
  exchangeRateUpdatedAt = null,
}: {
  budget: BudgetData
  contracts: ContractOption[]
  meetings: MeetingOption[]
  canManage: boolean
  canApprove: boolean
  onDeletedHref?: string
  baseCurrency?: Currency
  currentExchangeRate?: number | null
  exchangeRateUpdatedAt?: Date | null
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deletingBudget, setDeletingBudget] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [revising, setRevising] = useState(false)

  // Currency + rate are the budget's own (captured when it was proposed),
  // falling back to the org defaults for budgets created before that.
  const currency: Currency = budget.currency ?? baseCurrency
  const secondary = secondaryCurrency(currency)
  // Budgeted figures lock to the rate frozen at approval; while DRAFT they
  // use this budget's working rate (or the org's live rate as a fallback).
  // Actual figures always use the live rate - that's the point.
  const workingRate = budget.exchangeRate ?? currentExchangeRate
  const budgetedRate = budget.status === "APPROVED" ? budget.approvalExchangeRate : workingRate
  const actualRate = budget.status === "APPROVED" ? currentExchangeRate ?? workingRate : workingRate

  async function handleRevise() {
    setRevising(true)
    const result = await reviseBudget(budget.id)
    setRevising(false)
    if (result.success) toast.success(`Now Rev ${result.revision}`)
    else toast.error(result.error || "Failed to revise")
  }
  // When a rate is set, the converted amount gets its own column (per
  // Dara: "two columns... the pesos and a USD column") rather than a
  // sub-line under each figure.
  const showSecondary = !!(budgetedRate || actualRate)

  // Primary column figures in the budget's own currency (MXN for a peso
  // budget). Previously hardcoded "$".
  const money = (n: number) => formatMoney(n, currency)

  function secondaryCell(amount: number | null, rate: number | null) {
    if (amount == null || !rate) return "—"
    return formatMoney(convertToSecondary(amount, rate, currency), secondary)
  }

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
    const headers = ["#", "Category", "Line Item", "Budgeted", "Actual", "Variance", "Prior Year Actual"]
    if (budgetedRate || actualRate) headers.push(`Budgeted (${secondary})`, `Actual (${secondary})`)
    const rows: (string | number)[][] = [headers]
    for (const g of groups) {
      for (const { item, number } of g.items) {
        const variance = item.actualAmount != null ? item.actualAmount - item.budgetedAmount : ""
        const row: (string | number)[] = [
          number,
          g.key === GROUP_NONE ? "" : g.label,
          item.label,
          Math.round(item.budgetedAmount),
          item.actualAmount != null ? Math.round(item.actualAmount) : "",
          variance === "" ? "" : Math.round(variance),
          item.previousYearActual != null ? Math.round(item.previousYearActual) : "",
        ]
        if (budgetedRate || actualRate) {
          row.push(
            budgetedRate ? Math.round(convertToSecondary(item.budgetedAmount, budgetedRate, currency)) : "",
            actualRate && item.actualAmount != null
              ? Math.round(convertToSecondary(item.actualAmount, actualRate, currency))
              : ""
          )
        }
        rows.push(row)
      }
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

  // Group line items by category, order groups by total budgeted spend
  // (biggest first), order lines within a group the same way, and number
  // the whole thing continuously so "line 14" in a meeting is unambiguous.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const colCount = (canManage ? 7 : 6) + (showSecondary ? 2 : 0)

  const groupMap = new Map<string, { items: LineItem[]; total: number }>()
  for (const item of budget.lineItems) {
    const key = item.category ?? GROUP_NONE
    const g = groupMap.get(key) ?? { items: [], total: 0 }
    g.items.push(item)
    g.total += item.budgetedAmount
    groupMap.set(key, g)
  }
  let counter = 0
  const groups = [...groupMap.entries()]
    .map(([key, g]) => ({
      key,
      label: key === GROUP_NONE ? "Uncategorised" : budgetCategoryLabel[key as BudgetCategory],
      total: g.total,
      items: [...g.items].sort((a, b) => b.budgetedAmount - a.budgetedAmount),
    }))
    .sort((a, b) => b.total - a.total)
    .map((g) => ({ ...g, items: g.items.map((item) => ({ item, number: ++counter })) }))
  // Only show group headers when there's a real category in play.
  const showGroups = groups.length > 1 || (groups.length === 1 && groups[0].key !== GROUP_NONE)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide bg-gray-900 text-white rounded px-1.5 py-0.5">
              Rev {budget.revision}
            </span>
            <h2 className="text-xl font-bold">
              {budget.periodLabel || budget.year} — {budget.version}
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                budget.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {budget.status === "APPROVED" ? "Approved" : "Draft"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {currency}
            {(budget.status === "APPROVED" ? budget.approvalExchangeRate : workingRate)
              ? ` · 1 USD = ${(budget.status === "APPROVED" ? budget.approvalExchangeRate : workingRate)!.toLocaleString()} MXN${budget.status === "APPROVED" ? " (frozen at approval)" : ""}`
              : " · no exchange rate set"}
            {budget.periodLabel && ` · anchor year ${budget.year}`}
          </p>
          {budget.status === "APPROVED" && budget.approvedAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Approved {formatDateISO(budget.approvedAt)}
              {budget.meetingTitle && ` at ${budget.meetingTitle}`}
            </p>
          )}
          {budget.notes && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{budget.notes}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {canManage && budget.status === "DRAFT" && (
            <>
              <BudgetMetaDialog
                budgetId={budget.id}
                current={{
                  year: budget.year,
                  periodLabel: budget.periodLabel,
                  version: budget.version,
                  currency,
                  exchangeRate: budget.exchangeRate,
                }}
              />
              <Button size="sm" variant="outline" onClick={handleRevise} disabled={revising}>
                {revising ? "…" : "Revise (Rev " + (budget.revision + 1) + ")"}
              </Button>
            </>
          )}
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

      <ExchangeRateBar
        baseCurrency={baseCurrency}
        currentExchangeRate={currentExchangeRate}
        exchangeRateUpdatedAt={exchangeRateUpdatedAt}
        canManage={canManage}
      />

      <Card className="py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="text-right font-medium px-3 py-2 w-10">#</th>
                <th className="text-left font-medium px-3 py-2">Line Item</th>
                <th className="text-right font-medium px-3 py-2">Budgeted{showSecondary && ` (${currency})`}</th>
                {showSecondary && <th className="text-right font-medium px-3 py-2">Budgeted ({secondary})</th>}
                <th className="text-right font-medium px-3 py-2">Actual{showSecondary && ` (${currency})`}</th>
                {showSecondary && <th className="text-right font-medium px-3 py-2">Actual ({secondary})</th>}
                <th className="text-right font-medium px-3 py-2">Variance</th>
                <th className="text-right font-medium px-3 py-2">Prior Year</th>
                {canManage && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups.map((g) => {
                const open = !collapsed.has(g.key)
                return (
                  <Fragment key={g.key}>
                    {showGroups && (
                      <tr className="bg-gray-100/70 border-t">
                        <td colSpan={colCount} className="px-3 py-1.5">
                          <button
                            type="button"
                            onClick={() => toggleGroup(g.key)}
                            className="w-full flex items-center gap-2 text-xs font-semibold text-gray-700"
                          >
                            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            {g.label}
                            <span className="text-gray-400 font-normal">
                              · {g.items.length} line{g.items.length !== 1 ? "s" : ""}
                            </span>
                            <span className="ml-auto tabular-nums">
                              {money(g.total)}
                              {showSecondary && (
                                <span className="text-gray-400 font-normal"> · {secondaryCell(g.total, budgetedRate)}</span>
                              )}
                            </span>
                          </button>
                        </td>
                      </tr>
                    )}
                    {(open || !showGroups) &&
                      g.items.map(({ item, number }) => {
                        const variance = item.actualAmount != null ? item.actualAmount - item.budgetedAmount : null
                        return (
                          <tr key={item.id}>
                            <td className="text-right px-3 py-2 tabular-nums text-gray-400">{number}</td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{item.label}</p>
                              {item.contractTitle && (
                                <p className="text-xs text-gray-400">from contract: {item.contractTitle}</p>
                              )}
                            </td>
                            <td className="text-right px-3 py-2 tabular-nums">{money(item.budgetedAmount)}</td>
                            {showSecondary && (
                              <td className="text-right px-3 py-2 tabular-nums text-gray-500">
                                {secondaryCell(item.budgetedAmount, budgetedRate)}
                              </td>
                            )}
                            <td className="text-right px-3 py-2 tabular-nums">
                              {item.actualAmount != null ? money(item.actualAmount) : "—"}
                            </td>
                            {showSecondary && (
                              <td className="text-right px-3 py-2 tabular-nums text-gray-500">
                                {secondaryCell(item.actualAmount, actualRate)}
                              </td>
                            )}
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
                  </Fragment>
                )
              })}
              {budget.lineItems.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-3 py-8 text-center text-gray-400">
                    No line items yet.
                  </td>
                </tr>
              )}
            </tbody>
            {budget.lineItems.length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50 font-semibold">
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2">Total</td>
                  <td className="text-right px-3 py-2 tabular-nums">{money(totals.budgeted)}</td>
                  {showSecondary && (
                    <td className="text-right px-3 py-2 tabular-nums text-gray-500 font-normal">
                      {secondaryCell(totals.budgeted, budgetedRate)}
                    </td>
                  )}
                  <td className="text-right px-3 py-2 tabular-nums">
                    {totals.hasActual ? money(totals.actual) : "—"}
                  </td>
                  {showSecondary && (
                    <td className="text-right px-3 py-2 tabular-nums text-gray-500 font-normal">
                      {totals.hasActual ? secondaryCell(totals.actual, actualRate) : "—"}
                    </td>
                  )}
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
