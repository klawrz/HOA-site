import { requireOwnerAccess } from "@/lib/require-owner-access"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { effectiveAllocations } from "@/lib/unit-allocation"
import { DUES_FREQUENCY_LABEL } from "@/lib/dues"
import { getEffectiveOperatingBudget, duesInstalments } from "@/lib/dues-schedule"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"
import { ServiceContacts, type ServiceContact } from "@/components/owner/service-contacts"

const typeLabel: Record<string, string> = {
  REGULAR_DUES: "Regular Dues",
  SPECIAL: "Special Assessment",
}

function usd(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

// Date-only values (assessment due dates, instalment dates) are stored /
// built at UTC midnight - read them in UTC so they don't slip a day.
function iso(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10)
}

function chargeStatus(due: number, paid: number) {
  if (paid <= 0) return { label: "Unpaid", color: "bg-red-100 text-red-700" }
  if (paid < due) return { label: "Partial", color: "bg-amber-100 text-amber-700" }
  return { label: "Paid", color: "bg-green-100 text-green-700" }
}

export default async function OwnerDuesPage() {
  const session = await requireOwnerAccess()
  if (!session) redirect("/dashboard")
  const orgId = session.user.orgId ?? ""

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true },
    include: { unit: true },
    orderBy: { unit: { number: "asc" } },
  })
  const unitIds = ownerships.map((o) => o.unitId)

  const [
    budget,
    orgUnits,
    org,
    unitLabel,
    assessmentCharges,
    unitCharges,
    pmContract,
    unitManagers,
    securityContact,
    ownMembership,
  ] = await Promise.all([
    getEffectiveOperatingBudget(orgId),
    db.unit.findMany({ where: { orgId }, select: { id: true, allocationPercent: true } }),
    db.organization.findUnique({
      where: { id: orgId },
      select: { baseCurrency: true, currentExchangeRate: true },
    }),
    getUnitLabel(orgId),
    unitIds.length
      ? db.assessmentCharge.findMany({
          where: { unitId: { in: unitIds } },
          include: { assessment: true, unit: true },
          orderBy: { assessment: { dueDate: "asc" } },
        })
      : Promise.resolve([]),
    unitIds.length
      ? db.unitCharge.findMany({
          where: { unitId: { in: unitIds } },
          include: { unit: true },
          orderBy: { chargedOn: "desc" },
        })
      : Promise.resolve([]),
    db.pMContract.findFirst({
      where: { orgId, status: "ACTIVE" },
      include: { company: { include: { emergencyContacts: true } } },
      orderBy: { startDate: "desc" },
    }),
    unitIds.length
      ? db.unitManagerAssignment.findMany({
          where: { unitId: { in: unitIds } },
          include: { user: true },
        })
      : Promise.resolve([]),
    db.keyContact.findFirst({
      where: { orgId, category: "SECURITY" },
      orderBy: { sortOrder: "asc" },
    }),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId } },
      select: { onboardingSteps: true },
    }),
  ])

  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("dues")
  const allocations = effectiveAllocations(orgUnits)

  const rate = org?.currentExchangeRate ?? 17.5
  const base = org?.baseCurrency ?? "USD"
  const toUsd = (amt: number) => (base === "MXN" ? amt / rate : amt)

  // Anticipated dues per owned unit, from the effective (approved or
  // proposed) operating budget.
  const unitDues = ownerships.map((o) => {
    const pct = allocations.get(o.unitId) ?? 0
    const annual = budget ? budget.totalUsd * (pct / 100) : null
    const instalments =
      budget && annual != null ? duesInstalments(annual, o.unit.duesFrequency, budget.year) : []
    return { ownership: o, pct, annual, instalments }
  })

  const anticipatedDuesTotal = unitDues.reduce((s, u) => s + (u.annual ?? 0), 0)

  // Outstanding = real (issued) charges only.
  const issuedAssessmentOutstanding = assessmentCharges
    .filter((c) => c.assessment.status === "ISSUED")
    .reduce((s, c) => s + Math.max(toUsd(c.amountDue) - toUsd(c.amountPaid), 0), 0)
  const unitChargeOutstanding = unitCharges.reduce(
    (s, c) => s + Math.max(toUsd(c.amount) - toUsd(c.amountPaid), 0),
    0,
  )
  const totalOutstanding = issuedAssessmentOutstanding + unitChargeOutstanding

  const anticipatedAssessmentTotal = assessmentCharges
    .filter((c) => c.assessment.status !== "ISSUED")
    .reduce((s, c) => s + toUsd(c.amountDue), 0)

  // Contacts panel data.
  const company = pmContract?.company
  const ec = company?.emergencyContacts[0]
  const pmContact: ServiceContact | null = company
    ? {
        name: company.legalName,
        role: company.primaryContactName ? `Contact: ${company.primaryContactName}` : null,
        phone: company.primaryContactPhone ?? company.phone ?? null,
        email: company.primaryContactEmail ?? company.email ?? null,
        note: ec ? `After-hours: ${ec.name}${ec.phone ? ` · ${ec.phone}` : ""}` : null,
      }
    : null

  const firstManager = unitManagers[0]
  const umContact: ServiceContact | null = firstManager
    ? {
        name: firstManager.user?.name ?? firstManager.name ?? firstManager.user?.email ?? "Unit Manager",
        role: unitManagers.length > 1 ? "Multiple units delegated" : "Delegated by the owner",
        phone: firstManager.phone ?? null,
        email: firstManager.user?.email ?? firstManager.email ?? null,
      }
    : null

  const securityService: ServiceContact | null = securityContact
    ? {
        name: securityContact.name,
        role: securityContact.role,
        phone: securityContact.phone,
        email: securityContact.email,
        note: securityContact.notes,
      }
    : null

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="dues" alreadyComplete={onboardingStepDone} />
      <div>
        <Link
          href="/dashboard/owner/financial"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Financial
        </Link>
        <h1 className="text-2xl font-bold">Dues &amp; Assessments</h1>
        <p className="text-gray-500 mt-1">
          What your unit owes and when &mdash; anticipated dues by quarter, assessments, and per-villa
          charges. All amounts in US dollars.
        </p>
      </div>

      <ServiceContacts propertyManager={pmContact} unitManager={umContact} security={securityService} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs text-gray-400">Outstanding now (issued charges)</p>
          <p className="text-2xl font-bold">{usd(totalOutstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400">
            Anticipated {budget?.year ?? ""} total (dues + assessments)
          </p>
          <p className="text-2xl font-bold">
            {usd(anticipatedDuesTotal + anticipatedAssessmentTotal)}
          </p>
        </Card>
      </div>

      {budget?.isProposed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Dues below are <strong>anticipated</strong> &mdash; derived from the{" "}
          <strong>{budget.label ?? `${budget.year}`} {budget.version.toLowerCase()}</strong> operating
          budget, which owners have not yet adopted. Figures become final when the budget is approved at
          the AGM.
        </div>
      )}
      {!budget && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          No operating budget is on file yet, so a dues figure can&apos;t be estimated.
        </div>
      )}

      {unitDues.map(({ ownership: o, pct, annual, instalments }) => {
        const unitName = unitDisplayName(unitLabel, o.unit.number, o.unit.building)
        const uAssessments = assessmentCharges.filter((c) => c.unitId === o.unitId)
        const uCharges = unitCharges.filter((c) => c.unitId === o.unitId)
        return (
          <div key={o.unitId} className="space-y-3">
            <h2 className="text-lg font-semibold pt-2">{unitName}</h2>

            {/* Anticipated dues */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {budget?.isProposed ? "Anticipated" : "Estimated"} annual dues
                    </p>
                    <p className="text-xs text-gray-400">
                      {pct.toFixed(2)}% allocation &times;{" "}
                      {budget ? `${budget.label ?? budget.year} operating budget` : "budget"}
                      {" "}&middot; {DUES_FREQUENCY_LABEL[o.unit.duesFrequency]}
                    </p>
                  </div>
                  <p className="text-xl font-bold">{annual != null ? usd(annual) : "—"}</p>
                </div>

                {instalments.length > 0 && (
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
                        {instalments.map((inst) => (
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

            {/* Assessments */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-2">Assessments</p>
                {uAssessments.length === 0 ? (
                  <p className="text-sm text-gray-400">No assessments on file for this unit.</p>
                ) : (
                  <div className="space-y-2">
                    {uAssessments.map((c) => {
                      const anticipated = c.assessment.status !== "ISSUED"
                      const st = chargeStatus(toUsd(c.amountDue), toUsd(c.amountPaid))
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">{c.assessment.title}</p>
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                                {typeLabel[c.assessment.type] ?? c.assessment.type}
                              </span>
                              {anticipated ? (
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
                              Due {iso(c.assessment.dueDate)}
                              {c.assessment.split === "EVEN" ? " · even split across all units" : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{usd(toUsd(c.amountDue))}</p>
                            {c.amountPaid > 0 && (
                              <p className="text-xs text-green-600">{usd(toUsd(c.amountPaid))} paid</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charges */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-semibold mb-2">Charges (water, fees)</p>
                {uCharges.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No per-villa charges on file. Quarterly water billing appears here once the Property
                    Manager enters meter readings.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {uCharges.map((c) => {
                      const st = chargeStatus(toUsd(c.amount), toUsd(c.amountPaid))
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">
                                {c.label ?? c.type.charAt(0) + c.type.slice(1).toLowerCase()}
                              </p>
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
                            <p className="text-sm font-semibold">{usd(toUsd(c.amount))}</p>
                            {c.amountPaid > 0 && (
                              <p className="text-xs text-green-600">{usd(toUsd(c.amountPaid))} paid</p>
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
        )
      })}
    </div>
  )
}
