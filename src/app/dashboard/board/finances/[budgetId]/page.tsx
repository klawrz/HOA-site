import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { BudgetEditor } from "@/components/budgets/budget-editor"

export default async function BoardBudgetDetailPage({
  params,
}: {
  params: Promise<{ budgetId: string }>
}) {
  const { budgetId } = await params
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const [budget, contracts, meetings] = await Promise.all([
    db.budget.findUnique({
      where: { id: budgetId },
      include: { lineItems: { include: { contract: true }, orderBy: { sortOrder: "asc" } }, meeting: true },
    }),
    db.contract.findMany({
      where: { orgId: session.user.orgId ?? undefined, scope: "PROPERTY", type: "RECURRING" },
      orderBy: { title: "asc" },
    }),
    db.meeting.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { date: "desc" } }),
  ])

  if (!budget || budget.orgId !== session.user.orgId) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/board/finances"
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Finances
      </Link>

      <BudgetEditor
        budget={{
          id: budget.id,
          year: budget.year,
          version: budget.version,
          status: budget.status,
          notes: budget.notes,
          approvedAt: budget.approvedAt,
          meetingTitle: budget.meeting?.title ?? null,
          lineItems: budget.lineItems.map((i) => ({
            id: i.id,
            label: i.label,
            budgetedAmount: i.budgetedAmount,
            actualAmount: i.actualAmount,
            previousYearActual: i.previousYearActual,
            contractId: i.contractId,
            contractTitle: i.contract?.title ?? null,
          })),
        }}
        contracts={contracts.map((c) => ({ id: c.id, title: c.title, amount: c.amount, billingPeriod: c.billingPeriod }))}
        meetings={meetings.map((m) => ({ id: m.id, title: m.title, date: m.date }))}
        canManage
        canApprove
        onDeletedHref="/dashboard/board/finances"
      />
    </div>
  )
}
