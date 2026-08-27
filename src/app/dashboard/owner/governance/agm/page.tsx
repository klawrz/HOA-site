import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canPreviewRole } from "@/lib/role-access"
import { AgmDetailContent } from "@/components/key-info/agm-detail-content"

export default async function OwnerAgmPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "OWNER")) redirect("/dashboard")

  const orgId = session.user.orgId ?? ""
  const agm = await db.keyDate.findUnique({ where: { orgId_type: { orgId, type: "AGM" } } })
  const [pastAgms, relevantDocuments, linkedBudgets] = await Promise.all([
    db.meeting.findMany({
      where: { orgId, type: "AGM", ...(agm?.meetingId ? { id: { not: agm.meetingId } } : {}) },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, title: true, date: true, minutes: true },
    }),
    agm?.meetingId
      ? db.document.findMany({
          where: { meetingId: agm.meetingId },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, category: true, fileUrl: true },
        })
      : Promise.resolve([]),
    agm?.meetingId
      ? db.budget.findMany({
          where: { meetingId: agm.meetingId },
          orderBy: { year: "desc" },
          select: { id: true, year: true, version: true, status: true, approvedAt: true },
        })
      : Promise.resolve([]),
  ])

  // A plain Owner can view but not edit - only an Owner who's also a Board
  // Member (isBoardMember) gets the edit dialog, same gate as
  // canManageKeyDates in the action itself.
  const canManage = session.user.role === "ACCOUNT_OWNER" || session.user.isBoardMember === true

  return (
    <AgmDetailContent
      agm={agm}
      canManage={canManage}
      backHref="/dashboard/owner/governance"
      backLabel="Back to Governance"
      documentsHref="/dashboard/owner/governance"
      budgetsHref="/dashboard/owner/financial"
      pastAgms={pastAgms}
      relevantDocuments={relevantDocuments}
      linkedBudgets={linkedBudgets}
    />
  )
}
