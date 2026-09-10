import Link from "next/link"
import { AlertTriangle, AlertCircle, Info } from "lucide-react"
import type { BoardFinancialAlert, BoardAlertLevel } from "@/lib/board-financial-alerts"
import { boardAlertLevelLabel } from "@/lib/board-financial-alerts"

const style: Record<
  BoardAlertLevel,
  { wrap: string; badge: string; icon: typeof AlertTriangle; iconClass: string }
> = {
  critical: {
    wrap: "border-red-300 bg-red-50",
    badge: "bg-red-600 text-white",
    icon: AlertCircle,
    iconClass: "text-red-600",
  },
  warning: {
    wrap: "border-amber-300 bg-amber-50",
    badge: "bg-amber-500 text-white",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
  },
  info: {
    wrap: "border-blue-200 bg-blue-50",
    badge: "bg-blue-500 text-white",
    icon: Info,
    iconClass: "text-blue-600",
  },
}

export function BoardFinancialAlerts({ alerts }: { alerts: BoardFinancialAlert[] }) {
  if (alerts.length === 0) return null

  const criticalCount = alerts.filter((a) => a.level === "critical").length
  const summary =
    `${alerts.length} ${alerts.length === 1 ? "item needs" : "items need"} the Board’s attention` +
    (criticalCount > 0 ? ` · ${criticalCount} critical` : "")

  return (
    <section aria-label="Financial alerts" className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <h2 className="text-sm font-semibold text-gray-800">Financial alerts</h2>
        <span className="text-sm font-normal text-gray-500">{summary}</span>
      </div>

      <div className="space-y-2">
        {alerts.map((a) => {
          const s = style[a.level]
          const Icon = s.icon
          return (
            <Link
              key={a.id}
              href={a.href}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors hover:brightness-[0.98] ${s.wrap}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.iconClass}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.badge}`}
                  >
                    {boardAlertLevelLabel[a.level]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-700">{a.detail}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
