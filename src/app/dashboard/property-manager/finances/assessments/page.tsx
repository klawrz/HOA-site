import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { AssessmentList } from "@/components/assessments/assessment-list"
import { NewAssessmentDialog } from "@/components/assessments/new-assessment-dialog"
import { canPreviewRole } from "@/lib/role-access"

export default async function PropertyManagerAssessmentsPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [assessments, budgets, org] = await Promise.all([
    db.assessment.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { charges: true },
      orderBy: { dueDate: "desc" },
    }),
    db.budget.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      orderBy: { year: "desc" },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/property-manager/finances"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Finances
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Assessments</h1>
            <p className="text-gray-500 mt-1">
              One-off special levies. Decided by the owners; a Board member enters them.
            </p>
          </div>
          <NewAssessmentDialog
            detailBasePath="/dashboard/property-manager/finances/assessments"
            budgets={budgets.map((b) => ({ id: b.id, label: `${b.year} — ${b.version} (${b.type === "CAPITAL" ? "Capital" : "Operating"})` }))}
          />
        </div>
      </div>

      <AssessmentList
        assessments={assessments.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          status: a.status,
          totalAmount: a.totalAmount,
          totalCollected: a.charges.reduce((s, c) => s + c.amountPaid, 0),
          dueDate: a.dueDate,
        }))}
        detailBasePath="/dashboard/property-manager/finances/assessments"
        currency={org?.baseCurrency ?? "USD"}
        exchangeRate={org?.currentExchangeRate ?? null}
      />
    </div>
  )
}
