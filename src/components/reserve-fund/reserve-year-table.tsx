"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Download } from "lucide-react"
import { downloadCsv } from "@/lib/csv"
import { setReserveYearComment } from "@/app/actions/reserve-fund"

interface YearRow {
  year: number
  opening: number
  additions: number
  drawdowns: number
  closing: number
}

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function CommentCell({ year, initial, canManage }: { year: number; initial: string; canManage: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    setEditing(false)
    if (value === initial) return
    setSaving(true)
    const result = await setReserveYearComment(year, value)
    setSaving(false)
    if (!result.success) toast.error("Failed to save comment")
  }

  if (!canManage) {
    return <span className="text-gray-600 whitespace-pre-line">{initial || <span className="text-gray-300">—</span>}</span>
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left w-full text-gray-600 hover:bg-gray-50 rounded px-1 -mx-1 whitespace-pre-line"
        disabled={saving}
      >
        {value || <span className="text-gray-300">Click to add a note...</span>}
      </button>
    )
  }

  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      autoFocus
      className="h-16 text-sm resize-none min-w-[160px]"
      disabled={saving}
    />
  )
}

export function ReserveYearTable({
  rows,
  comments,
  canManage,
}: {
  rows: YearRow[]
  comments: Record<number, string>
  canManage: boolean
}) {
  const currentYear = new Date().getFullYear()

  function handleExport() {
    const header = ["", ...rows.map((r) => String(r.year))]
    const csvRows: (string | number)[][] = [header]
    csvRows.push(["Opening Balance", ...rows.map((r) => r.opening)])
    csvRows.push(["Additions", ...rows.map((r) => r.additions)])
    csvRows.push(["Drawdowns", ...rows.map((r) => r.drawdowns)])
    csvRows.push(["Closing Balance", ...rows.map((r) => r.closing)])
    csvRows.push(["Comment", ...rows.map((r) => comments[r.year] ?? "")])
    downloadCsv(`reserve-fund-${rows[0]?.year}-${rows[rows.length - 1]?.year}.csv`, csvRows)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">7-Year Reserve Fund History & Outlook</h2>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>
      <Card className="py-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="text-left font-medium px-3 py-2 sticky left-0 bg-gray-50">&nbsp;</th>
                {rows.map((r) => (
                  <th
                    key={r.year}
                    className={`text-right font-medium px-3 py-2 min-w-[120px] ${r.year === currentYear ? "bg-blue-50 text-blue-700" : ""}`}
                  >
                    {r.year}
                    {r.year === currentYear && <div className="font-normal text-blue-400">Current</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-3 py-2 text-gray-500 sticky left-0 bg-white">Opening Balance</td>
                {rows.map((r) => (
                  <td key={r.year} className={`text-right px-3 py-2 tabular-nums ${r.year === currentYear ? "bg-blue-50" : ""}`}>
                    {money(r.opening)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-500 sticky left-0 bg-white">Additions</td>
                {rows.map((r) => (
                  <td key={r.year} className={`text-right px-3 py-2 tabular-nums text-green-700 ${r.year === currentYear ? "bg-blue-50" : ""}`}>
                    {r.additions > 0 ? `+${money(r.additions)}` : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-500 sticky left-0 bg-white">Drawdowns</td>
                {rows.map((r) => (
                  <td key={r.year} className={`text-right px-3 py-2 tabular-nums text-red-700 ${r.year === currentYear ? "bg-blue-50" : ""}`}>
                    {r.drawdowns > 0 ? `-${money(r.drawdowns)}` : "—"}
                  </td>
                ))}
              </tr>
              <tr className="font-semibold">
                <td className="px-3 py-2 sticky left-0 bg-white">Closing Balance</td>
                {rows.map((r) => (
                  <td key={r.year} className={`text-right px-3 py-2 tabular-nums ${r.year === currentYear ? "bg-blue-50" : ""}`}>
                    {money(r.closing)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-gray-500 align-top sticky left-0 bg-white">Comment</td>
                {rows.map((r) => (
                  <td key={r.year} className={`px-3 py-2 align-top ${r.year === currentYear ? "bg-blue-50" : ""}`}>
                    <CommentCell year={r.year} initial={comments[r.year] ?? ""} canManage={canManage} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
