"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, Pencil, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { deleteReserveCapitalItem } from "@/app/actions/reserve-capital-items"
import { estimatedExpenditureDate, isWithinYears } from "@/lib/reserve-fund"
import { formatDateISO } from "@/lib/utils"
import { CapitalItemDialog } from "./capital-item-dialog"

// Long-term (reserve fund study) horizon - items due within this many years
// are flagged as near-term; further-out items still show, just unflagged.
const NEAR_TERM_YEARS = 10

interface CapitalItemRow {
  id: string
  name: string
  lastDone: Date
  lifeExpectancyYears: number
  estimatedCost: number | null
  notes: string | null
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function CapitalItemsTable({ items, canManage }: { items: CapitalItemRow[]; canManage: boolean }) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await deleteReserveCapitalItem(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove item")
  }

  const rows = items
    .map((item) => ({ ...item, dueDate: estimatedExpenditureDate(item.lastDone, item.lifeExpectancyYears) }))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Long-Term Reserve Items</CardTitle>
          <p className="text-sm text-gray-500 mt-0.5">
            Major components the reserve fund exists to pay for, and when they&apos;re next due
          </p>
        </div>
        {canManage && <CapitalItemDialog />}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No long-term items on file yet.</p>
        ) : (
          <Card className="py-0 overflow-hidden">
            <div className="divide-y">
              {rows.map((item) => {
                const nearTerm = isWithinYears(item.dueDate, NEAR_TERM_YEARS)
                return (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {nearTerm && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        <p className="text-sm font-medium truncate">{item.name}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        Last done {formatDateISO(item.lastDone)} · {item.lifeExpectancyYears}yr life
                        {item.notes && ` · ${item.notes}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${nearTerm ? "text-amber-700" : "text-gray-700"}`}>
                          Due {formatDateISO(item.dueDate)}
                        </p>
                        {item.estimatedCost != null && (
                          <p className="text-xs text-gray-400">{money(item.estimatedCost)}</p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-2">
                          <CapitalItemDialog
                            existing={{
                              id: item.id,
                              name: item.name,
                              lastDone: item.lastDone.toISOString().slice(0, 10),
                              lifeExpectancyYears: item.lifeExpectancyYears,
                              estimatedCost: item.estimatedCost,
                              notes: item.notes ?? "",
                            }}
                            trigger={
                              <button className="text-gray-400 hover:text-gray-700 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                          <button
                            onClick={() => handleRemove(item.id)}
                            disabled={removingId === item.id}
                            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
