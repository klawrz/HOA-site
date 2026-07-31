import { Landmark } from "lucide-react"

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function ReserveFundSummary({
  balance,
  target,
  policy,
  heldAt,
}: {
  balance: number
  target: number | null
  policy?: string | null
  heldAt?: string | null
}) {
  const percent = target && target > 0 ? Math.min((balance / target) * 100, 100) : null

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-gray-400">Current Amount Held</p>
          <p className="text-2xl font-bold">{money(balance)}</p>
        </div>
        {target != null ? (
          <>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${balance >= target ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {percent!.toFixed(0)}% of {money(target)} target
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">No board-approved target set yet</p>
        )}
      </div>

      <div className="flex items-start gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
        <Landmark className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-gray-400">Held At</p>
          <p>{heldAt || <span className="text-gray-400">Not on file</span>}</p>
        </div>
      </div>

      <div className="text-sm">
        <p className="text-xs text-gray-400 mb-1">Reserve Fund Policy</p>
        {policy ? (
          <p className="text-gray-600 whitespace-pre-line">{policy}</p>
        ) : (
          <p className="text-gray-400">No policy on file yet.</p>
        )}
      </div>
    </div>
  )
}
