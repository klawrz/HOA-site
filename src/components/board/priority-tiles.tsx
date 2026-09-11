import Link from "next/link"
import { DollarSign, Wrench, Building2, Users, CalendarDays } from "lucide-react"
import { quickLinkColors, type QuickLinkColor } from "@/components/dashboard/quick-link-tiles"
import { formatDate } from "@/lib/utils"
import type { BoardPriorityTileData } from "@/lib/board-priority-tiles"

interface TileDef {
  href: string
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: QuickLinkColor
}

// One compact coloured priority tile - shares the quickLinkColors palette
// with the Owner/PM quick-link rows so the whole system stays visually
// consistent (amber for the PM, rose for Units, teal for people). Kept
// small enough that the whole set fits on a single row.
function Tile({ href, icon: Icon, label, value, sub, color }: TileDef) {
  const c = quickLinkColors[color]
  return (
    <Link
      href={href}
      className={`flex flex-col rounded-lg px-2 py-1 transition-colors ${c.bg} ${c.hoverBg}`}
    >
      <div className="flex items-center gap-1">
        <Icon className={`h-2.5 w-2.5 shrink-0 ${c.icon}`} />
        <span className={`text-[9px] font-semibold uppercase tracking-wide truncate ${c.text}`}>{label}</span>
      </div>
      <p className="text-[11px] font-bold leading-tight truncate text-gray-900">
        {value}
        {sub && <span className="font-normal text-gray-400"> · {sub}</span>}
      </p>
    </Link>
  )
}

export function BoardPriorityTiles({ data }: { data: BoardPriorityTileData }) {
  // Built as an array + explicit column count so the row always lays out
  // on a single line no matter how many tiles there are (up to ~6),
  // same technique as QuickLinkTiles.
  const tiles: TileDef[] = [
    {
      href: "/dashboard/board/finances",
      icon: DollarSign,
      label: "Finances",
      color: "indigo",
      value: `$${Math.round(data.reserveBalance).toLocaleString()}`,
      sub:
        data.overBudgetCount > 0
          ? `${data.overBudgetCount} over budget`
          : data.reserveTarget
            ? `of $${Math.round(data.reserveTarget).toLocaleString()}`
            : undefined,
    },
    {
      href: "/dashboard/board/pm",
      icon: Wrench,
      label: "Property Mgmt",
      color: "amber",
      value: data.pmName ?? "None on file",
      sub:
        data.pmStatus === "EXPIRED"
          ? "ended"
          : data.pmStatus === "EXPIRING_SOON"
            ? "expiring"
            : data.hasPM
              ? "active"
              : undefined,
    },
    {
      href: "/dashboard/board/units",
      icon: Building2,
      label: "Units",
      color: "rose",
      value: `${data.unitCount}`,
      sub: `${data.rentedCount} rented`,
    },
    {
      href: "/dashboard/board/employees",
      icon: Users,
      label: "Employees",
      color: "teal",
      value: data.activeEmployeeCount > 0 ? `${data.activeEmployeeCount}` : "None",
    },
    {
      href: "/dashboard/board/agm",
      icon: CalendarDays,
      label: "AGM",
      color: "orange",
      value: data.agmDate ? formatDate(data.agmDate) : "Not scheduled",
      sub:
        data.agmDate && data.agmDays !== null && data.agmDays >= 0
          ? data.agmDays === 0
            ? "today"
            : `${data.agmDays}d`
          : undefined,
    },
  ]

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
    >
      {tiles.map((t) => (
        <Tile key={t.href} {...t} />
      ))}
    </div>
  )
}
