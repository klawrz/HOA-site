import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Receipt, ChevronRight, PiggyBank, TableProperties } from "lucide-react"
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

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          href="/dashboard/property-manager/finances/assessments"
          className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Dues & Assessments</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
        <Link
          href="/dashboard/property-manager/finances/reserve"
          className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Reserve Fund</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
        <Link
          href="/dashboard/property-manager/finances/comparison"
          className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 hover:border-gray-300 transition-colors sm:col-span-2"
        >
          <div className="flex items-center gap-2">
            <TableProperties className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Multi-Year Comparison</span>
            <span className="text-xs text-gray-400">Last year, this year, and proposed next year, side by side</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">Operating Budgets</h2>
          <NewBudgetDialog
            detailBasePath="/dashboard/property-manager/finances"
            type="OPERATING"
            triggerLabel="+ New Operating Budget"
            previousBudget={operating[0] ? { id: operating[0].id, year: operating[0].year, version: operating[0].version, lineItemCount: operating[0].lineItems.length } : null}
          />
        </div>
        <BudgetList budgets={operating.map(toBudgetRow)} detailBasePath="/dashboard/property-manager/finances" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">Capital Expenditures</h2>
          <NewBudgetDialog
            detailBasePath="/dashboard/property-manager/finances"
            type="CAPITAL"
            triggerLabel="+ New Capital Budget"
            previousBudget={capital[0] ? { id: capital[0].id, year: capital[0].year, version: capital[0].version, lineItemCount: capital[0].lineItems.length } : null}
          />
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
