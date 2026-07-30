import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { AssessmentList } from "@/components/assessments/assessment-list"
import { NewAssessmentDialog } from "@/components/assessments/new-assessment-dialog"

export default async function OwnerBoardAssessmentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER" || !session.user.isBoardMember) redirect("/dashboard")

  const [assessments, budgets] = await Promise.all([
    db.assessment.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { charges: true },
      orderBy: { dueDate: "desc" },
    }),
    db.budget.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      orderBy: { year: "desc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/owner/governance/board/finances"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Finances
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dues & Assessments</h1>
            <p className="text-gray-500 mt-1">Issued charges to owners, and payment reconciliation</p>
          </div>
          <NewAssessmentDialog
            detailBasePath="/dashboard/owner/governance/board/finances/assessments"
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
        detailBasePath="/dashboard/owner/governance/board/finances/assessments"
      />
    </div>
  )
}
