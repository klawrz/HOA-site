import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { DuesRoster } from "@/components/assessments/dues-roster"
import { getUnitLabel } from "@/lib/unit-label"
import { canPreviewRole } from "@/lib/role-access"

export default async function BoardDuesPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  const [approvedBudget, proposedBudget, units, org, unitLabel] = await Promise.all([
    db.budget.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "APPROVED", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: { year: "desc" },
    }),
    db.budget.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "DRAFT", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    }),
    db.unit.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      select: { id: true, number: true, building: true, allocationPercent: true, duesFrequency: true },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    getUnitLabel(session.user.orgId),
  ])

  const duesBudget = approvedBudget ?? proposedBudget
  const duesBudgetTotal = duesBudget?.lineItems.reduce((s, i) => s + i.budgetedAmount, 0) ?? null
  const duesBudgetLabel = duesBudget
    ? approvedBudget
      ? `the ${duesBudget.year} approved operating budget`
      : `the proposed ${duesBudget.periodLabel || duesBudget.year} operating budget (not yet approved)`
    : "the operating budget"

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/board/finances"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Finances
        </Link>
        <h1 className="text-2xl font-bold">Dues</h1>
        <p className="text-gray-500 mt-1">
          Each unit&apos;s recurring share of the operating budget, by allocation percentage
        </p>
      </div>

      <DuesRoster
        unitLabel={unitLabel}
        units={units}
        budgetTotal={duesBudgetTotal}
        budgetCurrency={duesBudget?.currency ?? org?.baseCurrency ?? "USD"}
        exchangeRate={duesBudget?.exchangeRate ?? org?.currentExchangeRate ?? null}
        budgetLabel={duesBudgetLabel}
      />
    </div>
  )
}
