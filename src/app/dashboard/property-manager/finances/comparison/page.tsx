import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { BudgetComparisonTable } from "@/components/budgets/budget-comparison-table"

export default async function PropertyManagerBudgetComparisonPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const budgets = await db.budget.findMany({
    where: { orgId: session.user.orgId ?? undefined },
    include: { lineItems: true },
    orderBy: { year: "asc" },
  })

  const operating = budgets.filter((b) => b.type === "OPERATING")
  const capital = budgets.filter((b) => b.type === "CAPITAL")

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/property-manager/finances"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Finances
        </Link>
        <h1 className="text-2xl font-bold">Multi-Year Comparison</h1>
        <p className="text-gray-500 mt-1">
          Last year, this year, and proposed next year side by side - export to share with the HOA&apos;s accountant.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">Operating Budgets</h2>
        <BudgetComparisonTable
          budgets={operating.map((b) => ({
            id: b.id,
            year: b.year,
            version: b.version,
            status: b.status,
            lineItems: b.lineItems.map((i) => ({
              label: i.label,
              budgetedAmount: i.budgetedAmount,
              actualAmount: i.actualAmount,
            })),
          }))}
        />
      </div>

      {capital.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 mb-3">Capital Expenditures</h2>
          <BudgetComparisonTable
            budgets={capital.map((b) => ({
              id: b.id,
              year: b.year,
              version: b.version,
              status: b.status,
              lineItems: b.lineItems.map((i) => ({
                label: i.label,
                budgetedAmount: i.budgetedAmount,
                actualAmount: i.actualAmount,
              })),
            }))}
          />
        </div>
      )}
    </div>
  )
}
