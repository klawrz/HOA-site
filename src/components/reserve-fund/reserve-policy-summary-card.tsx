import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ResolvedReservePolicy } from "@/lib/reserve-policy-summary"
import { ReservePolicyFiguresDialog } from "./reserve-policy-figures-dialog"

const usd = (n: number) => `$${n.toLocaleString("en-US")}`
const mxn = (n: number) => `MXN ${n.toLocaleString("en-US")}`

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export function ReservePolicySummaryCard({
  figures: p,
  canManage,
}: {
  figures: ResolvedReservePolicy
  canManage: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base">Reserve Fund Policy</CardTitle>
          <p className="text-xs text-gray-400">
            Revision {p.revision} · {p.status} · as of {p.asOf}
          </p>
        </div>
        {canManage && <ReservePolicyFiguresDialog current={p} />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Figure label="Reserve balance" value={usd(p.balance)} sub={`USD, ${p.asOf}`} />
          <Figure label="Target level" value={usd(p.target)} sub="placeholder — AGM motion" />
          <Figure label="Coverage" value={`${p.coveragePct}%`} sub="balance ÷ target" />
          <Figure
            label={`Minimum floor (${p.floorPct}%)`}
            value={usd(p.floor)}
            sub="breach triggers a special assessment"
          />
          <Figure
            label={`Roof drawdown ${p.roofYear}`}
            value={usd(p.roofDrawdown)}
            sub={`special assessments ${p.roofYear}–${p.roofYear + 1}`}
          />
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Needed in the FY{p.budgetYear} operating budget
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
            {mxn(p.budgetLineMxn)}
            <span className="ml-2 text-base font-semibold text-emerald-700">
              ≈ {usd(p.budgetLineUsd)} / year
            </span>
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Reserve top-up line.{" "}
            {p.budgetLineIsOverride
              ? "Set by the Board."
              : `Closes the ${usd(p.shortfallToClose)} gap to target over ${p.topUpYears} years.`}{" "}
            The {p.roofYear} roof is funded separately by special assessments, so it does not load
            onto this line.
          </p>
        </div>

        <p className="text-xs text-gray-400">
          Figures from the Reserve Fund Policy, Revision {p.revision}. The target and assessment
          amounts are placeholders pending owner motions at the AGM
          {canManage ? " — use Edit figures once they are voted." : "."}
        </p>
      </CardContent>
    </Card>
  )
}
