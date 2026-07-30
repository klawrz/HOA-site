import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { AssessmentEditor } from "@/components/assessments/assessment-editor"

export default async function OwnerBoardAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session || session.user.role !== "OWNER" || !session.user.isBoardMember) redirect("/dashboard")

  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      budget: true,
      charges: {
        include: { unit: { include: { ownerships: { where: { isCurrent: true }, include: { owner: true } } } } },
      },
    },
  })

  if (!assessment || assessment.orgId !== session.user.orgId) notFound()

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/owner/governance/board/finances/assessments"
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Dues & Assessments
      </Link>

      <AssessmentEditor
        assessment={{
          id: assessment.id,
          title: assessment.title,
          type: assessment.type,
          status: assessment.status,
          totalAmount: assessment.totalAmount,
          dueDate: assessment.dueDate,
          notes: assessment.notes,
          budgetLabel: assessment.budget ? `${assessment.budget.year} — ${assessment.budget.version}` : null,
          charges: assessment.charges.map((c) => ({
            id: c.id,
            unitNumber: c.unit.number,
            unitBuilding: c.unit.building,
            ownerName: c.unit.ownerships[0]?.owner.name ?? c.unit.ownerships[0]?.owner.email ?? null,
            amountDue: c.amountDue,
            amountPaid: c.amountPaid,
            paymentMethod: c.paymentMethod,
            paidAt: c.paidAt,
          })),
        }}
        canManage
        canIssue
        onDeletedHref="/dashboard/owner/governance/board/finances/assessments"
      />
    </div>
  )
}
