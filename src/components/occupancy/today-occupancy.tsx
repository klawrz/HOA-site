"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, CalendarDays } from "lucide-react"
import { OccupancyCalendar } from "./occupancy-calendar"
import { occupancyTypeLabel } from "@/lib/occupancy-styles"
import { formatDate } from "@/lib/utils"

type Entry = {
  id: string
  startDate: Date
  endDate: Date
  type: string
  occupantName: string | null
  occupantContact: string | null
  notes: string | null
}

type UnitOccupancy = {
  id: string
  number: string
  building: string | null
  entries: Entry[]
}

function summarize(entries: Entry[], now: Date) {
  const current = entries.find((e) => e.startDate <= now && e.endDate >= now)
  const next = entries
    .filter((e) => e.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]
  return { current, next }
}

export function TodayOccupancy({ units }: { units: UnitOccupancy[] }) {
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const now = new Date()

  return (
    <div className="divide-y">
      {units.map((unit) => {
        const { current, next } = summarize(unit.entries, now)
        const open = openUnitId === unit.id

        return (
          <div key={unit.id} className="py-2.5">
            <button
              type="button"
              onClick={() => setOpenUnitId(open ? null : unit.id)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2 text-sm min-w-0">
                <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium shrink-0">
                  Unit {unit.number}
                  {unit.building && ` — Building ${unit.building}`}
                </span>
                <span className="text-gray-500 truncate">
                  {current
                    ? `Occupied now (${occupancyTypeLabel[current.type]}${current.occupantName ? `, ${current.occupantName}` : ""}, through ${formatDate(current.endDate)})`
                    : "Vacant now"}
                  {next &&
                    ` · Next: ${occupancyTypeLabel[next.type]}${next.occupantName ? ` (${next.occupantName})` : ""}, ${formatDate(next.startDate)}`}
                  {!current && !next && " · No occupancy logged"}
                </span>
              </div>
              {open ? (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </button>
            {open && (
              <div className="mt-3">
                <OccupancyCalendar unitId={unit.id} entries={unit.entries} canManage />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
