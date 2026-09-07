import Link from "next/link"
import { DollarSign, Wrench, Building2, Users, CalendarDays } from "lucide-react"
import { quickLinkColors, type QuickLinkColor } from "@/components/dashboard/quick-link-tiles"
import { formatDate } from "@/lib/utils"
import type { BoardPriorityTileData } from "@/lib/board-priority-tiles"

// One coloured priority tile - shares the quickLinkColors palette with the
// Owner/PM quick-link rows so the whole system stays visually consistent
// (amber for the PM, rose for Units, teal for people). Carries a live
// value + sub-line, unlike those rows, since the Board asked to see the
// state at a glance from anywhere, not just a shortcut.
function Tile({
  href,
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  href: string
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: QuickLinkColor
}) {
  const c = quickLinkColors[color]
  return (
    <Link
      href={href}
      className={`flex flex-col rounded-xl px-3 py-2.5 transition-colors ${c.bg} ${c.hoverBg}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`flex items-center justify-center h-6 w-6 rounded-full shrink-0 ${c.chip}`}>
          <Icon className={`h-3.5 w-3.5 ${c.icon}`} />
        </span>
        <span className={`text-[11px] font-semibold leading-tight ${c.text}`}>{label}</span>
      </div>
      <p className="text-sm font-bold mt-1.5 truncate text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 truncate">{sub}</p>}
    </Link>
  )
}

export function BoardPriorityTiles({ data }: { data: BoardPriorityTileData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <Tile
        href="/dashboard/board/finances"
        icon={DollarSign}
        label="Finances"
        color="indigo"
        value={`$${Math.round(data.reserveBalance).toLocaleString()} reserve`}
        sub={
          data.overBudgetCount > 0
            ? `${data.overBudgetCount} line item${data.overBudgetCount !== 1 ? "s" : ""} over budget`
            : data.reserveTarget
              ? `of $${Math.round(data.reserveTarget).toLocaleString()} target`
              : undefined
        }
      />
      <Tile
        href="/dashboard/board/pm"
        icon={Wrench}
        label="Property Mgmt"
        color="amber"
        value={data.pmName ?? "None on file"}
        sub={
          data.pmStatus === "EXPIRED"
            ? "Contract ended"
            : data.pmStatus === "EXPIRING_SOON"
              ? "Contract expiring soon"
              : data.hasPM
                ? "Contract active"
                : undefined
        }
      />
      <Tile
        href="/dashboard/board/units"
        icon={Building2}
        label="Units"
        color="rose"
        value={`${data.unitCount} unit${data.unitCount !== 1 ? "s" : ""}`}
        sub={`${data.rentedCount} rented`}
      />
      <Tile
        href="/dashboard/board/employees"
        icon={Users}
        label="Employees"
        color="teal"
        value={data.activeEmployeeCount > 0 ? `${data.activeEmployeeCount} on staff` : "None on file"}
      />
      <Tile
        href="/dashboard/board/key-info/agm"
        icon={CalendarDays}
        label="AGM"
        color="orange"
        value={data.agmDate ? formatDate(data.agmDate) : "Not scheduled"}
        sub={
          data.agmDate && data.agmDays !== null && data.agmDays >= 0
            ? data.agmDays === 0
              ? "today"
              : `${data.agmDays} days away`
            : undefined
        }
      />
    </div>
  )
}
