import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RESERVE_POLICY_SUMMARY as P } from "@/lib/reserve-policy-summary"

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

export function ReservePolicySummaryCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reserve Fund Policy</CardTitle>
        <p className="text-xs text-gray-400">
          Revision {P.revision} · {P.status} · frozen {P.frozenOn}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Figure label="Reserve balance" value={usd(P.balance)} sub="USD, start of 2026" />
          <Figure label="Target level" value={usd(P.target)} sub="placeholder — AGM motion" />
          <Figure label="Coverage" value={`${P.coveragePct}%`} sub="balance ÷ target" />
          <Figure
            label={`Minimum floor (${P.floorPct}%)`}
            value={usd(P.floor)}
            sub="breach triggers a special assessment"
          />
          <Figure
            label={`Roof drawdown ${P.roofYear}`}
            value={usd(P.roofDrawdown)}
            sub={`special assessments ${P.roofYear}–${P.roofYear + 1}`}
          />
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Needed in the FY{P.budgetYear} operating budget
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-900">
            {mxn(P.budgetLineMxn)}
            <span className="ml-2 text-base font-semibold text-emerald-700">
              ≈ {usd(P.budgetLineUsd)} / year
            </span>
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Reserve top-up line. Closes the {usd(P.shortfallToClose)} gap to target over{" "}
            {P.topUpYears} years. The {P.roofYear} roof is funded separately by special
            assessments, so it does not load onto this line.
          </p>
        </div>

        <p className="text-xs text-gray-400">
          Figures from the Reserve Fund Policy, Revision {P.revision} (draft for owner review).
          The target and assessment amounts are placeholders pending owner motions at the AGM.
        </p>
      </CardContent>
    </Card>
  )
}
