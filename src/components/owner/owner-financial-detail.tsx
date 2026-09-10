import { Card, CardContent } from "@/components/ui/card"
import { ServiceContacts } from "@/components/owner/service-contacts"
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

// The owner money picture: PM / Security contacts, the outstanding +
// anticipated totals, and per-unit - a one-line dues & assessments summary
// (allocation share, annual total, payment schedule), the instalment
// schedule with due dates, the assessments, and charges totalled by
// quarter (payable at quarter-end). Shared by the dashboard and the Dues,
// Assessments & Charges page.
export function OwnerFinancialDetail({ data }: { data: OwnerFinancialOverview }) {
  const { budget } = data

  return (
    <div className="space-y-4">
      <ServiceContacts propertyManager={data.propertyManager} security={data.security} />

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
          <h3 className="text-base font-semibold pt-1">{u.unitName}</h3>

          {/* Dues & assessments summary line */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm">
                <span className="font-semibold">Dues &amp; assessments — </span>
                allocation share <strong>{u.allocationPercent.toFixed(2)}%</strong> ·{" "}
                {u.annualDuesUsd != null ? (
                  <>
                    total <strong>{usd(u.annualDuesUsd)}/yr</strong>
                  </>
                ) : (
                  <>total <strong>—</strong></>
                )}{" "}
                · {u.paymentScheduleLabel}
                {budget?.isProposed ? " (anticipated)" : ""}
              </p>

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

              {u.assessments.length > 0 && (
                <div className="space-y-2 border-t pt-2">
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

          {/* Charges by quarter */}
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold mb-2">Charges by quarter (water, fees)</p>
              {u.quarterlyCharges.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No charges recorded. Water is billed quarterly — totals appear here, payable at the
                  end of each quarter, once the Property Manager enters meter readings.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b">
                        <th className="py-1.5 pr-3 font-medium">Quarter</th>
                        <th className="py-1.5 pr-3 font-medium">Payable by</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Total</th>
                        <th className="py-1.5 font-medium text-right">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.quarterlyCharges.map((q) => (
                        <tr key={q.label} className="border-b last:border-0">
                          <td className="py-1.5 pr-3">{q.label}</td>
                          <td className="py-1.5 pr-3 text-gray-600">{iso(q.dueDate)}</td>
                          <td className="py-1.5 pr-3 text-right font-medium">{usd(q.totalUsd)}</td>
                          <td className="py-1.5 text-right text-green-600">
                            {q.paidUsd > 0 ? usd(q.paidUsd) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
