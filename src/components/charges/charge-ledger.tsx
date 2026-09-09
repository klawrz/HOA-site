"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Currency } from "@/generated/prisma"
import { convertToSecondary, formatMoney } from "@/lib/currency"
import { UNIT_CHARGE_TYPE_LABEL } from "@/lib/charges"
import { formatDate } from "@/lib/utils"
import { recordChargePayment, deleteUnitCharge } from "@/app/actions/charges"
import { Check, Trash2, Undo2 } from "lucide-react"
import type { UnitChargeType } from "@/generated/prisma"

interface ChargeRow {
  id: string
  unitName: string
  type: UnitChargeType
  label: string | null
  amount: number
  amountPaid: number
  chargedOn: Date
  dueDate: Date | null
}

export function ChargeLedger({
  charges,
  currency = "USD",
  exchangeRate = null,
}: {
  charges: ChargeRow[]
  currency?: Currency
  exchangeRate?: number | null
}) {
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const peso = (n: number): number | null =>
    currency === "MXN" ? n : exchangeRate != null ? convertToSecondary(n, exchangeRate, "USD") : null
  const usd = (n: number): number | null =>
    currency === "USD" ? n : exchangeRate != null ? convertToSecondary(n, exchangeRate, "MXN") : null
  const p = (n: number | null) => (n != null ? formatMoney(n, "MXN") : "—")
  const u = (n: number | null) => (n != null ? formatMoney(n, "USD") : "—")

  function togglePaid(row: ChargeRow) {
    setBusyId(row.id)
    const nextPaid = row.amountPaid >= row.amount ? 0 : row.amount
    startTransition(async () => {
      const r = await recordChargePayment(row.id, { amountPaid: nextPaid })
      setBusyId(null)
      if (!r.success) toast.error("Couldn't update the charge")
      else toast.success(nextPaid > 0 ? "Marked paid" : "Marked unpaid")
    })
  }

  function remove(row: ChargeRow) {
    setBusyId(row.id)
    startTransition(async () => {
      const r = await deleteUnitCharge(row.id)
      setBusyId(null)
      if (!r.success) toast.error("Couldn't delete the charge")
    })
  }

  const outstanding = charges.reduce((s, c) => s + Math.max(0, c.amount - c.amountPaid), 0)
  const billed = charges.reduce((s, c) => s + c.amount, 0)

  // Newest first, then grouped by unit so a bulk "all units" charge reads in order.
  const rows = [...charges].sort(
    (a, b) =>
      b.chargedOn.getTime() - a.chargedOn.getTime() ||
      a.unitName.localeCompare(b.unitName, undefined, { numeric: true })
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Charges</CardTitle>
        <p className="text-xs text-gray-400">
          {charges.length} charge{charges.length !== 1 ? "s" : ""} · billed {p(peso(billed))} / {u(usd(billed))} ·
          outstanding {p(peso(outstanding))} / {u(usd(outstanding))}
        </p>
      </CardHeader>
      <CardContent>
        {charges.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No charges yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400">
                  <th className="text-left font-medium py-2 pr-3">Unit</th>
                  <th className="text-left font-medium py-2 px-3">Type</th>
                  <th className="text-left font-medium py-2 px-3">Description</th>
                  <th className="text-left font-medium py-2 px-3">Charged</th>
                  <th className="text-right font-medium py-2 px-3">Amount (MXN)</th>
                  <th className="text-right font-medium py-2 px-3">Amount (US$)</th>
                  <th className="text-left font-medium py-2 px-3">Status</th>
                  <th className="py-2 pl-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  const paid = row.amountPaid >= row.amount
                  return (
                    <tr key={row.id} className={busyId === row.id && pending ? "opacity-50" : ""}>
                      <td className="py-2 pr-3 font-medium">{row.unitName}</td>
                      <td className="py-2 px-3">{UNIT_CHARGE_TYPE_LABEL[row.type]}</td>
                      <td className="py-2 px-3 text-gray-600">{row.label || "—"}</td>
                      <td className="py-2 px-3 text-gray-500 tabular-nums">{formatDate(row.chargedOn)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{p(peso(row.amount))}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-500">{u(usd(row.amount))}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            paid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {paid ? "Paid" : "Outstanding"}
                        </span>
                      </td>
                      <td className="py-2 pl-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => togglePaid(row)}
                            disabled={pending}
                            title={paid ? "Mark unpaid" : "Mark paid"}
                            className="text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                          >
                            {paid ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => remove(row)}
                            disabled={pending}
                            title="Delete charge"
                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
