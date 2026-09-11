// The printable per-villa quarterly dues table. Shared by the standalone
// dues route and the combined AGM packet.

export type DuesRow = { label: string; pct: number; annual: number; q: number }

const int = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)

export function DuesTableBody({
  fyLabel,
  unitLabel,
  currency,
  totalFormatted,
  rows,
  totalPct,
  totalAnnual,
  sourceNote,
}: {
  fyLabel: number
  unitLabel: string
  currency: string
  totalFormatted: string
  rows: DuesRow[]
  totalPct: number
  totalAnnual: number
  sourceNote?: string
}) {
  return (
    <div>
      <p className="text-center font-semibold mb-1">
        {`Cuotas Condominales ${fyLabel} · ${fyLabel} Homeowners' Association Dues`}
      </p>
      <p className="text-center text-xs text-gray-500 mb-1">
        Presupuesto operativo total / Total operating budget: {totalFormatted} · amounts below in{" "}
        {currency}
      </p>
      {sourceNote && <p className="text-center text-[11px] text-gray-400 mb-3">{sourceNote}</p>}

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full min-w-[34rem] text-xs sm:text-[13px] border-collapse">
          <thead>
            <tr className="border-y text-left">
              <th className="py-2 pr-2 font-medium">{unitLabel}</th>
              <th className="py-2 px-2 font-medium text-right">%</th>
              <th className="py-2 px-2 font-medium text-right whitespace-nowrap">Anual / Annual</th>
              <th className="py-2 px-2 font-medium text-right">Q1</th>
              <th className="py-2 px-2 font-medium text-right">Q2</th>
              <th className="py-2 px-2 font-medium text-right">Q3</th>
              <th className="py-2 px-2 font-medium text-right">Q4</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b last:border-0">
                <td className="py-1.5 pr-2 whitespace-nowrap">{r.label}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{r.pct.toFixed(2)}%</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{int(r.annual)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{int(r.q)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{int(r.q)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{int(r.q)}</td>
                <td className="py-1.5 px-2 text-right tabular-nums">{int(r.q)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-medium">
              <td className="py-2 pr-2">Total</td>
              <td className="py-2 px-2 text-right tabular-nums">{totalPct.toFixed(2)}%</td>
              <td className="py-2 px-2 text-right tabular-nums">{int(totalAnnual)}</td>
              <td className="py-2 px-2 text-right tabular-nums">{int(totalAnnual / 4)}</td>
              <td className="py-2 px-2 text-right tabular-nums">{int(totalAnnual / 4)}</td>
              <td className="py-2 px-2 text-right tabular-nums">{int(totalAnnual / 4)}</td>
              <td className="py-2 px-2 text-right tabular-nums">{int(totalAnnual / 4)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-gray-400 mt-3">
        Quarterly amounts are the annual figure divided evenly across four instalments (Jan 1, Apr 1,
        Jul 1, Oct 1). Rounding may cause the quarters to differ from the annual total by a few units.
      </p>
    </div>
  )
}
