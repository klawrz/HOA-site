"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { deleteReserveTransaction } from "@/app/actions/reserve-fund"
import { formatDateISO } from "@/lib/utils"

interface TransactionRow {
  id: string
  type: string
  amount: number
  date: Date
  description: string
  createdByName: string | null
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function TransactionList({ transactions }: { transactions: TransactionRow[] }) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await deleteReserveTransaction(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove transaction")
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No transactions recorded yet.</p>
  }

  const sorted = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <Card className="py-0 overflow-hidden">
      <div className="divide-y">
        {sorted.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t.description}</p>
              <p className="text-xs text-gray-400">
                {formatDateISO(t.date)}
                {t.createdByName && ` · ${t.createdByName}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className={`text-sm font-semibold ${t.type === "DEPOSIT" ? "text-green-700" : "text-red-700"}`}>
                {t.type === "DEPOSIT" ? "+" : "-"}
                {money(t.amount)}
              </p>
              <button
                onClick={() => handleRemove(t.id)}
                disabled={removingId === t.id}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
