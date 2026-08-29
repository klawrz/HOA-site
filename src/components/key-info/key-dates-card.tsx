"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { CalendarDays, ChevronRight, Trash2, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateISO } from "@/lib/utils"
import { parseVisibleRoles, audienceRoleLabel } from "@/lib/audience"
import { deleteCustomKeyDate } from "@/app/actions/custom-key-dates"
import { NewKeyDateDialog } from "./new-key-date-dialog"
import type { KeyDateEntry } from "@/lib/key-dates"

// Reusable across roles (Board/PM/Owner all render this, right below the
// Board roster) - per Dara 2026-08-27. AGM/Dues stay plain links (their
// own dedicated pages hold the real detail); CustomKeyDate rows (added
// 2026-08-28) are informational only, with a delete control for whoever
// can manage them - same canManage gate as the AGM edit dialog.
export function KeyDatesCard({ dates, canManage }: { dates: KeyDateEntry[]; canManage: boolean }) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await deleteCustomKeyDate(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove key date")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> Key Dates
        </CardTitle>
        {canManage && <NewKeyDateDialog />}
      </CardHeader>
      <CardContent className="space-y-1">
        {dates.length === 0 && <p className="text-sm text-gray-400">Nothing scheduled yet.</p>}
        {dates.map((d, i) => {
          const targets = canManage ? parseVisibleRoles(d.visibleRoles ?? null) : null
          const row = (
            <>
              <span className="text-sm font-medium">{d.label}</span>
              <span className="flex items-center gap-2 text-xs text-gray-500">
                {targets && (
                  <span className="flex items-center gap-1 text-purple-600" title={targets.map((r) => audienceRoleLabel[r]).join(", ")}>
                    <Users className="h-3 w-3" />
                  </span>
                )}
                {formatDateISO(d.date)}
                {d.href && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              </span>
            </>
          )
          const rowClass = "flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5"
          return (
            <div key={d.id ?? i} className="flex items-center gap-1">
              {d.href ? (
                <Link href={d.href} className={`${rowClass} flex-1 hover:bg-gray-100 transition-colors`}>
                  {row}
                </Link>
              ) : (
                <div className={`${rowClass} flex-1`}>{row}</div>
              )}
              {canManage && d.id && (
                <button
                  onClick={() => handleRemove(d.id!)}
                  disabled={removingId === d.id}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0 p-1"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
