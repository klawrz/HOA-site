function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function ReserveFundSummary({
  balance,
  target,
}: {
  balance: number
  target: number | null
}) {
  const percent = target && target > 0 ? Math.min((balance / target) * 100, 100) : null

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-gray-400">Current Reserve Balance</p>
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
  )
}
