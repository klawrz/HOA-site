"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, CheckCircle2 } from "lucide-react"
import { deleteRentPayment, markRentPaymentPaid } from "@/app/actions/lease"
import { RentPaymentDialog } from "./rent-payment-dialog"
import { formatDateISO } from "@/lib/utils"
import { PaymentMethod } from "@/generated/prisma"

interface RentPaymentRow {
  id: string
  amount: number
  dueDate: Date
  paidAt: Date | null
  paymentMethod: PaymentMethod | null
  notes: string | null
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function RentPaymentsPanel({
  leaseId,
  monthlyRent,
  payments,
}: {
  leaseId: string
  monthlyRent: number | null
  payments: RentPaymentRow[]
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleMarkPaid(id: string) {
    setBusyId(id)
    const result = await markRentPaymentPaid(id, new Date().toISOString().slice(0, 10))
    setBusyId(null)
    if (!result.success) toast.error("Failed to mark paid")
  }

  async function handleRemove(id: string) {
    setBusyId(id)
    const result = await deleteRentPayment(id)
    setBusyId(null)
    if (!result.success) toast.error("Failed to remove entry")
  }

  const sorted = [...payments].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
  const totalCollected = payments.reduce((s, p) => (p.paidAt ? s + p.amount : s), 0)
  const totalOutstanding = payments.reduce((s, p) => (p.paidAt ? s : s + p.amount), 0)

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Collected {money(totalCollected)}
          {totalOutstanding > 0 && <span className="text-amber-600"> · Outstanding {money(totalOutstanding)}</span>}
        </p>
        <RentPaymentDialog leaseId={leaseId} defaultAmount={monthlyRent} />
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400">No rent entries yet.</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
              <div>
                <span className="font-medium">{money(p.amount)}</span>
                <span className="text-xs text-gray-400 ml-2">Due {formatDateISO(p.dueDate)}</span>
                {p.paidAt && (
                  <span className="text-xs text-green-600 ml-2">Paid {formatDateISO(p.paidAt)}</span>
                )}
                {p.notes && <span className="text-xs text-gray-400 ml-2">{p.notes}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!p.paidAt && (
                  <button
                    onClick={() => handleMarkPaid(p.id)}
                    disabled={busyId === p.id}
                    className="text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
                    title="Mark paid"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleRemove(p.id)}
                  disabled={busyId === p.id}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
