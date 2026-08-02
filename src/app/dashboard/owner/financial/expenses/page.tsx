import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { ExpenseLogPanel } from "@/components/owner-expenses/expense-log-panel"
import { getUnitLabel } from "@/lib/unit-label"

export default async function OwnerExpensesPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const [expenses, ownerships, unitLabel] = await Promise.all([
    db.ownerExpense.findMany({
      where: { ownerId: session.user.id },
      include: { unit: true },
      orderBy: { date: "desc" },
    }),
    db.unitOwnership.findMany({
      where: { ownerId: session.user.id, isCurrent: true },
      include: { unit: true },
    }),
    getUnitLabel(session.user.orgId),
  ])

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/owner/financial"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Financial
        </Link>
        <h1 className="text-2xl font-bold">Expenses</h1>
        <p className="text-gray-500 mt-1">
          Your own expense log, categorized for easy year-end review - separate from formal contracts.
        </p>
      </div>

      <ExpenseLogPanel
        expenses={expenses}
        units={ownerships.map((o) => ({ id: o.unit.id, number: o.unit.number, building: o.unit.building }))}
        unitLabel={unitLabel}
      />
    </div>
  )
}
