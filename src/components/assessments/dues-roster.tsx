import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Currency } from "@/generated/prisma"
import { convertToSecondary, formatMoney } from "@/lib/currency"
import { effectiveAllocations } from "@/lib/unit-allocation"
import { DUES_FREQUENCY_LABEL, DUES_FREQUENCY_PER_YEAR, annualDues, perPaymentDues } from "@/lib/dues"
import { unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"
import type { DuesFrequency } from "@/generated/prisma"

interface RosterUnit {
  id: string
  number: string
  building: string | null
  allocationPercent: number | null
  duesFrequency: DuesFrequency
}

export function DuesRoster({
  unitLabel,
  units,
  budgetTotal,
  budgetCurrency = "USD",
  exchangeRate = null,
  budgetLabel,
  realAnnualByUnit = {},
}: {
  unitLabel: string
  units: RosterUnit[]
  budgetTotal: number | null
  budgetCurrency?: Currency
  exchangeRate?: number | null
  budgetLabel: string
  // What was actually billed per unit (always in the org's base
  // currency), pre-converted to both peso and USD - takes precedence over
  // the budget-based estimate for that unit when present.
  realAnnualByUnit?: Record<string, { peso: number; usd: number }>
}) {
  const alloc = effectiveAllocations(units)
  const ordered = [...units].sort(compareUnitNumbers)

  const peso = (nBase: number): number | null =>
    budgetCurrency === "MXN" ? nBase : exchangeRate != null ? convertToSecondary(nBase, exchangeRate, "USD") : null
  const usd = (nBase: number): number | null =>
    budgetCurrency === "USD" ? nBase : exchangeRate != null ? convertToSecondary(nBase, exchangeRate, "MXN") : null
  const p = (n: number | null) => (n != null ? formatMoney(n, "MXN") : "—")
  const u = (n: number | null) => (n != null ? formatMoney(n, "USD") : "—")

  const totalPercent = ordered.reduce((s, unit) => s + (alloc.get(unit.id) ?? 0), 0)
  const annualFor = (unit: RosterUnit): { peso: number | null; usd: number | null } => {
    const real = realAnnualByUnit[unit.id]
    if (real) return real
    const pct = alloc.get(unit.id) ?? 0
    const est = budgetTotal != null ? annualDues(pct, budgetTotal) : null
    return { peso: est != null ? peso(est) : null, usd: est != null ? usd(est) : null }
  }
  const totalPeso = ordered.reduce((s, unit) => s + (annualFor(unit).peso ?? 0), 0)
  const totalUsd = ordered.reduce((s, unit) => s + (annualFor(unit).usd ?? 0), 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dues by Unit</CardTitle>
        <p className="text-xs text-gray-400">
          Each unit&apos;s share of {budgetLabel}
          {budgetTotal != null && ` (${p(peso(budgetTotal))} MXN / ${u(usd(budgetTotal))})`}. Payment schedule is
          set on each unit&apos;s profile.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-400">
                <th className="text-left font-medium py-2 pr-3">Unit</th>
                <th className="text-right font-medium py-2 px-3">Allocation</th>
                <th className="text-right font-medium py-2 px-3">Annual (MXN)</th>
                <th className="text-right font-medium py-2 px-3">Annual (US$)</th>
                <th className="text-left font-medium py-2 px-3">Schedule</th>
                <th className="text-right font-medium py-2 px-3">Per payment (MXN)</th>
                <th className="text-right font-medium py-2 pl-3">Per payment (US$)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ordered.map((unit) => {
                const pct = alloc.get(unit.id) ?? 0
                const { peso: annualPeso, usd: annualUsd } = annualFor(unit)
                const perPeso = annualPeso != null ? perPaymentDues(annualPeso, unit.duesFrequency) : null
                const perUsd = annualUsd != null ? perPaymentDues(annualUsd, unit.duesFrequency) : null
                return (
                  <tr key={unit.id}>
                    <td className="py-2 pr-3 font-medium">{unitDisplayName(unitLabel, unit.number, unit.building)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{pct.toFixed(2)}%</td>
                    <td className="py-2 px-3 text-right tabular-nums">{p(annualPeso)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-500">{u(annualUsd)}</td>
                    <td className="py-2 px-3">
                      {DUES_FREQUENCY_LABEL[unit.duesFrequency]}
                      <span className="text-gray-400"> · &times;{DUES_FREQUENCY_PER_YEAR[unit.duesFrequency]}/yr</span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">{p(perPeso)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-gray-500">{u(perUsd)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 px-3 text-right tabular-nums">{totalPercent.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right tabular-nums">{totalPeso > 0 ? p(totalPeso) : "—"}</td>
                <td className="py-2 px-3 text-right tabular-nums text-gray-500 font-normal">
                  {totalUsd > 0 ? u(totalUsd) : "—"}
                </td>
                <td colSpan={3} className="py-2 px-3 text-xs font-normal text-gray-400">
                  {budgetTotal == null &&
                    Object.keys(realAnnualByUnit).length === 0 &&
                    "Approve or propose an operating budget to see dues amounts."}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
