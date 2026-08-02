import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, ChevronRight, Receipt } from "lucide-react"
import { billingPeriodLabel } from "@/lib/contract-styles"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"

// Only meaningful for a fair "per month" comparison across contracts billed
// on different cadences - not a substitute for the contract's own terms.
function monthlyEquivalent(amount: number, period: string) {
  if (period === "WEEKLY") return (amount * 52) / 12
  if (period === "YEARLY") return amount / 12
  return amount
}

export default async function OwnerFinancialPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const [ownerships, latestApprovedBudget, unitLabel] = await Promise.all([
    db.unitOwnership.findMany({
      where: { ownerId: session.user.id, isCurrent: true },
      include: {
        unit: {
          include: {
            leases: { where: { isActive: true }, include: { renter: true } },
            contracts: { include: { contractor: true }, orderBy: { createdAt: "desc" } },
          },
        },
      },
    }),
    session.user.orgId
      ? db.budget.findFirst({
          where: { orgId: session.user.orgId, status: "APPROVED", type: "OPERATING" },
          include: { lineItems: true },
          orderBy: { year: "desc" },
        })
      : Promise.resolve(null),
    getUnitLabel(session.user.orgId),
  ])

  const totalApprovedBudget = latestApprovedBudget?.lineItems.reduce((s, i) => s + i.budgetedAmount, 0) ?? null

  const unitIds = ownerships.map((o) => o.unitId)
  const issuedCharges = unitIds.length
    ? await db.assessmentCharge.findMany({
        where: { unitId: { in: unitIds }, assessment: { status: "ISSUED" } },
      })
    : []
  const totalOutstanding = issuedCharges.reduce((s, c) => s + Math.max(c.amountDue - c.amountPaid, 0), 0)

  const totalIncome = ownerships
    .flatMap((o) => o.unit.leases)
    .filter((l) => l.isActive && l.monthlyRent)
    .reduce((s, l) => s + (l.monthlyRent ?? 0), 0)

  const activeContracts = ownerships
    .flatMap((o) => o.unit.contracts.map((c) => ({ ...c, unit: o.unit })))
    .filter((c) => c.status === "ACTIVE")

  const recurringMonthlyTotal = activeContracts
    .filter((c) => c.type === "RECURRING" && c.amount && c.billingPeriod)
    .reduce((s, c) => s + monthlyEquivalent(c.amount!, c.billingPeriod!), 0)

  const oneTimeContracts = activeContracts.filter((c) => c.type !== "RECURRING" && c.amount)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financial</h1>
        <p className="text-gray-500 mt-1">
          Income and expenses across your units - rental income, dues, and contracted services, useful for
          tax reporting.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" /> Income
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between border-b pb-3">
            <p className="text-sm text-gray-500">Total monthly income</p>
            <p className="text-2xl font-bold">${totalIncome.toLocaleString()}/mo</p>
          </div>
          <div className="space-y-2">
            {ownerships.map((o) => {
              const lease = o.unit.leases[0]
              return (
                <div key={o.unit.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {unitDisplayName(unitLabel, o.unit.number, o.unit.building)}
                    </p>
                    {lease ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Rental income · {lease.renter.name ?? lease.renter.email} · since{" "}
                        {new Date(lease.startDate).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">No active lease</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-green-700">
                    {lease?.monthlyRent ? `+$${lease.monthlyRent.toLocaleString()}/mo` : "—"}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" /> Dues & Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-gray-500">Total outstanding (issued charges)</p>
            <p className="text-2xl font-bold">
              ${totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <Link
            href="/dashboard/owner/financial/dues"
            className="flex items-center justify-between text-sm text-blue-600 hover:underline pt-1"
          >
            {issuedCharges.length > 0 ? "View dues & assessments" : "No dues issued yet"}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" /> Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between border-b pb-3">
            <p className="text-sm text-gray-500">Contracted services, monthly-equivalent (approx.)</p>
            <p className="text-2xl font-bold">${recurringMonthlyTotal.toLocaleString()}/mo</p>
          </div>

          <div className="space-y-2">
            {ownerships.map((o) => {
              const percent = o.unit.allocationPercent
              const estimatedDues =
                totalApprovedBudget != null && percent != null ? totalApprovedBudget * (percent / 100) : null
              return (
                <div key={`dues-${o.unit.id}`} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      HOA Dues — {unitDisplayName(unitLabel, o.unit.number, o.unit.building)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {estimatedDues != null
                        ? `Est. from ${latestApprovedBudget!.year} approved budget (${percent}% allocation)`
                        : percent == null
                          ? "Allocation percentage not set yet - contact your Property Manager"
                          : "No approved budget yet"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-700">
                    {estimatedDues != null ? `-$${estimatedDues.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr` : "—"}
                  </p>
                </div>
              )
            })}

            {activeContracts
              .filter((c) => c.type === "RECURRING")
              .map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unitDisplayName(unitLabel, c.unit.number)} · {c.contractor.name ?? c.contractor.email}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-700">
                    {c.amount
                      ? `-$${c.amount.toLocaleString()}${c.billingPeriod ? ` / ${billingPeriodLabel[c.billingPeriod]}` : ""}`
                      : "—"}
                  </p>
                </div>
              ))}

            {oneTimeContracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {unitDisplayName(unitLabel, c.unit.number)} · {c.contractor.name ?? c.contractor.email} · one-time
                  </p>
                </div>
                <p className="text-sm font-semibold text-red-700">-${c.amount!.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/owner/financial/contracts"
            className="flex items-center justify-between text-sm text-blue-600 hover:underline pt-2"
          >
            Manage contracts
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/owner/financial/expenses"
            className="flex items-center justify-between text-sm text-blue-600 hover:underline"
          >
            Log an expense
            <ChevronRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
