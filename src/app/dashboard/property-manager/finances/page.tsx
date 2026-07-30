import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BudgetList } from "@/components/budgets/budget-list"
import { NewBudgetDialog } from "@/components/budgets/new-budget-dialog"
import { UnitAllocationTable } from "@/components/budgets/unit-allocation-table"

function toBudgetRow(b: { id: string; year: number; version: string; status: string; lineItems: { budgetedAmount: number }[] }) {
  return {
    id: b.id,
    year: b.year,
    version: b.version,
    status: b.status,
    lineItemCount: b.lineItems.length,
    totalBudgeted: b.lineItems.reduce((s, i) => s + i.budgetedAmount, 0),
  }
}

export default async function PropertyManagerFinancesPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const [budgets, units] = await Promise.all([
    db.budget.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { lineItems: true },
      orderBy: { year: "desc" },
    }),
    db.unit.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { number: "asc" } }),
  ])

  const operating = budgets.filter((b) => b.type === "OPERATING")
  const capital = budgets.filter((b) => b.type === "CAPITAL")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finances</h1>
        <p className="text-gray-500 mt-1">Annual budgets - drafted, revised, and approved</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">Operating Budgets</h2>
          <NewBudgetDialog detailBasePath="/dashboard/property-manager/finances" type="OPERATING" triggerLabel="+ New Operating Budget" />
        </div>
        <BudgetList budgets={operating.map(toBudgetRow)} detailBasePath="/dashboard/property-manager/finances" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">Capital Expenditures</h2>
          <NewBudgetDialog detailBasePath="/dashboard/property-manager/finances" type="CAPITAL" triggerLabel="+ New Capital Budget" />
        </div>
        <BudgetList budgets={capital.map(toBudgetRow)} detailBasePath="/dashboard/property-manager/finances" />
      </div>

      <UnitAllocationTable
        units={units.map((u) => ({
          id: u.id,
          number: u.number,
          building: u.building,
          allocationPercent: u.allocationPercent,
        }))}
      />
    </div>
  )
}
