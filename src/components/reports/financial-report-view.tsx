"use client"

import { Printer, Download, Landmark, PiggyBank, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/currency"
import { downloadCsv } from "@/lib/csv"
import { formatDateISO } from "@/lib/utils"
import type { Currency } from "@/generated/prisma"

interface BudgetSummary {
  id: string
  year: number
  version: string
  lineItems: { label: string; budgetedAmount: number; actualAmount: number | null }[]
  budgeted: number
  actual: number
  variance: number
}

interface AssessmentRow {
  id: string
  title: string
  type: string
  status: string
  dueDate: Date
  totalAmount: number
  totalCharged: number
  totalCollected: number
  outstanding: number
}

interface FinancialReportData {
  orgName: string
  currency: Currency
  reserveBalance: number
  reserveTarget: number | null
  reserveHeldAt: string | null
  reserveYearRows: { year: number; opening: number; additions: number; drawdowns: number; closing: number }[]
  bankSigningAuthority: string | null
  budgets: { operating: BudgetSummary | null; capital: BudgetSummary | null }
  assessments: AssessmentRow[]
  assessmentTotals: { totalCharged: number; totalCollected: number; outstanding: number }
}

function BudgetSection({ title, budget, currency }: { title: string; budget: BudgetSummary | null; currency: Currency }) {
  return (
    <Card className="break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!budget ? (
          <p className="text-sm text-gray-400">No approved budget on file.</p>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">
              {budget.year} — {budget.version}
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-1 font-normal">Line Item</th>
                  <th className="py-1 font-normal text-right">Budgeted</th>
                  <th className="py-1 font-normal text-right">Actual</th>
                </tr>
              </thead>
              <tbody>
                {budget.lineItems.map((li, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1">{li.label}</td>
                    <td className="py-1 text-right">{formatMoney(li.budgetedAmount, currency)}</td>
                    <td className="py-1 text-right text-gray-500">
                      {li.actualAmount != null ? formatMoney(li.actualAmount, currency) : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{formatMoney(budget.budgeted, currency)}</td>
                  <td className="py-2 text-right">{formatMoney(budget.actual, currency)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function FinancialReportView({ data }: { data: FinancialReportData }) {
  const { currency } = data

  function exportReserveCsv() {
    const rows: (string | number)[][] = [["Year", "Opening", "Additions", "Drawdowns", "Closing"]]
    for (const r of data.reserveYearRows) rows.push([r.year, r.opening, r.additions, r.drawdowns, r.closing])
    downloadCsv(`${data.orgName}-reserve-fund.csv`, rows)
  }

  function exportAssessmentsCsv() {
    const rows: (string | number)[][] = [
      ["Title", "Type", "Status", "Due Date", "Total", "Collected", "Outstanding"],
    ]
    for (const a of data.assessments) {
      rows.push([a.title, a.type, a.status, formatDateISO(a.dueDate), a.totalCharged, a.totalCollected, a.outstanding])
    }
    downloadCsv(`${data.orgName}-assessments.csv`, rows)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Financial Report</h1>
          <p className="text-gray-500 mt-1">{data.orgName} — generated {formatDateISO(new Date())}</p>
        </div>
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">{data.orgName} — Financial Report</h1>
        <p className="text-gray-500 text-sm">Generated {formatDateISO(new Date())}</p>
      </div>

      <Card className="break-inside-avoid">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4" /> Reserve Fund
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportReserveCsv} className="gap-1.5 print:hidden">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Current Balance</p>
              <p className="font-semibold text-lg">{formatMoney(data.reserveBalance, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Target</p>
              <p>{data.reserveTarget != null ? formatMoney(data.reserveTarget, currency) : "Not set"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Held At</p>
              <p>{data.reserveHeldAt || "Not on file"}</p>
            </div>
          </div>
          {data.bankSigningAuthority && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <p className="text-xs text-gray-400 mb-1">Signing Authority</p>
              <p className="text-gray-600 whitespace-pre-line">{data.bankSigningAuthority}</p>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b">
                <th className="py-1 font-normal">Year</th>
                <th className="py-1 font-normal text-right">Opening</th>
                <th className="py-1 font-normal text-right">Additions</th>
                <th className="py-1 font-normal text-right">Drawdowns</th>
                <th className="py-1 font-normal text-right">Closing</th>
              </tr>
            </thead>
            <tbody>
              {data.reserveYearRows.map((r) => (
                <tr key={r.year} className="border-b border-gray-50">
                  <td className="py-1">{r.year}</td>
                  <td className="py-1 text-right">{formatMoney(r.opening, currency)}</td>
                  <td className="py-1 text-right text-green-700">{formatMoney(r.additions, currency)}</td>
                  <td className="py-1 text-right text-red-700">{formatMoney(r.drawdowns, currency)}</td>
                  <td className="py-1 text-right font-medium">{formatMoney(r.closing, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <BudgetSection title="Operating Budget" budget={data.budgets.operating} currency={currency} />
      <BudgetSection title="Capital Budget" budget={data.budgets.capital} currency={currency} />

      <Card className="break-inside-avoid">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Dues & Assessments
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportAssessmentsCsv} className="gap-1.5 print:hidden">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Total Assessed</p>
              <p className="font-semibold">{formatMoney(data.assessmentTotals.totalCharged, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Collected</p>
              <p className="text-green-700">{formatMoney(data.assessmentTotals.totalCollected, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Outstanding</p>
              <p className="text-red-700">{formatMoney(data.assessmentTotals.outstanding, currency)}</p>
            </div>
          </div>
          {data.assessments.length === 0 ? (
            <p className="text-sm text-gray-400">No assessments on file.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-1 font-normal">Title</th>
                  <th className="py-1 font-normal">Status</th>
                  <th className="py-1 font-normal">Due</th>
                  <th className="py-1 font-normal text-right">Collected / Total</th>
                </tr>
              </thead>
              <tbody>
                {data.assessments.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="py-1">{a.title}</td>
                    <td className="py-1">{a.status}</td>
                    <td className="py-1">{formatDateISO(a.dueDate)}</td>
                    <td className="py-1 text-right">
                      {formatMoney(a.totalCollected, currency)} / {formatMoney(a.totalCharged, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center print:hidden flex items-center justify-center gap-1">
        <Landmark className="h-3 w-3" /> All figures are computed live from HOPE's records at the time this report was generated.
      </p>
    </div>
  )
}
