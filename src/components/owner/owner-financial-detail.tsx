import { Card, CardContent } from "@/components/ui/card"
import { ServiceContacts } from "@/components/owner/service-contacts"
import { DUES_FREQUENCY_LABEL } from "@/lib/dues"
import type { OwnerFinancialOverview } from "@/lib/owner-financial-overview"

function usd(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

// Date-only values are stored / built at UTC midnight - read them in UTC.
function iso(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10)
}

function chargeStatus(due: number, paid: number) {
  if (paid <= 0) return { label: "Unpaid", color: "bg-red-100 text-red-700" }
  if (paid < due) return { label: "Partial", color: "bg-amber-100 text-amber-700" }
  return { label: "Paid", color: "bg-green-100 text-green-700" }
}

const typeLabel: Record<string, string> = {
  REGULAR_DUES: "Regular Dues",
  SPECIAL: "Special Assessment",
}

// The full owner money picture: the PM / Unit Manager / Security panel, the
// outstanding + anticipated totals, and per-unit anticipated dues schedule,
// assessments and charges. Rendered on both the owner dashboard and the
// Dues & Assessments page from one getOwnerFinancialOverview() call.
export function OwnerFinancialDetail({ data }: { data: OwnerFinancialOverview }) {
  const { budget } = data

  return (
    <div className="space-y-4">
      <ServiceContacts
        propertyManager={data.propertyManager}
        unitManager={data.unitManager}
        security={data.security}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs text-gray-400">Outstanding now (issued charges)</p>
          <p className="text-2xl font-bold">{usd(data.totalOutstandingUsd)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400">
            Anticipated {budget?.year ?? ""} total (dues + assessments)
          </p>
          <p className="text-2xl font-bold">
            {usd(data.anticipatedDuesTotalUsd + data.anticipatedAssessmentTotalUsd)}
          </p>
        </Card>
      </div>

      {budget?.isProposed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dues below are <strong>anticipated</strong> — derived from the{" "}
          <strong>
            {budget.label ?? budget.year} {budget.version.toLowerCase()}
          </strong>{" "}
          operating budget, which owners have not yet adopted. Figures become final when the budget is
          approved at the AGM.
        </div>
      )}
      {!budget && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No operating budget is on file yet, so a dues figure can&apos;t be estimated.
        </div>
      )}

      {data.units.map((u) => (
        <div key={u.unitId} className="space-y-3">
          <h2 className="text-lg font-semibold pt-2">{u.unitName}</h2>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {budget?.isProposed ? "Anticipated" : "Estimated"} annual dues
                  </p>
                  <p className="text-xs text-gray-400">
                    {u.allocationPercent.toFixed(2)}% allocation ×{" "}
                    {budget ? `${budget.label ?? budget.year} operating budget` : "budget"} ·{" "}
                    {DUES_FREQUENCY_LABEL[u.duesFrequency]}
                  </p>
                </div>
                <p className="text-xl font-bold">{u.annualDuesUsd != null ? usd(u.annualDuesUsd) : "—"}</p>
              </div>

              {u.instalments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b">
                        <th className="py-1.5 pr-3 font-medium">Instalment</th>
                        <th className="py-1.5 pr-3 font-medium">Due date</th>
                        <th className="py-1.5 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.instalments.map((inst) => (
                        <tr key={inst.label} className="border-b last:border-0">
                          <td className="py-1.5 pr-3">{inst.label}</td>
                          <td className="py-1.5 pr-3 text-gray-600">{iso(inst.dueDate)}</td>
                          <td className="py-1.5 text-right font-medium">{usd(inst.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold mb-2">Assessments</p>
              {u.assessments.length === 0 ? (
                <p className="text-sm text-gray-400">No assessments on file for this unit.</p>
              ) : (
                <div className="space-y-2">
                  {u.assessments.map((a) => {
                    const st = chargeStatus(a.amountDueUsd, a.amountPaidUsd)
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{a.title}</p>
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                              {typeLabel[a.type] ?? a.type}
                            </span>
                            {a.anticipated ? (
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                                Anticipated — not yet issued
                              </span>
                            ) : (
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}
                              >
                                {st.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Due {iso(a.dueDate)}
                            {a.evenSplit ? " · even split across all units" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{usd(a.amountDueUsd)}</p>
                          {a.amountPaidUsd > 0 && (
                            <p className="text-xs text-green-600">{usd(a.amountPaidUsd)} paid</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold mb-2">Charges (water, fees)</p>
              {u.charges.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No per-villa charges on file. Quarterly water billing appears here once the Property
                  Manager enters meter readings.
                </p>
              ) : (
                <div className="space-y-2">
                  {u.charges.map((c) => {
                    const st = chargeStatus(c.amountUsd, c.amountPaidUsd)
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{c.label}</p>
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${st.color}`}
                            >
                              {st.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Charged {iso(c.chargedOn)}
                            {c.dueDate ? ` · due ${iso(c.dueDate)}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{usd(c.amountUsd)}</p>
                          {c.amountPaidUsd > 0 && (
                            <p className="text-xs text-green-600">{usd(c.amountPaidUsd)} paid</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
