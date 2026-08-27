import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canPreviewRole } from "@/lib/role-access"
import { AgmDetailContent } from "@/components/key-info/agm-detail-content"

export default async function BoardAgmPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

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

  return (
    <AgmDetailContent
      agm={agm}
      canManage
      backHref="/dashboard/board/key-info"
      backLabel="Back to Key Information"
      documentsHref="/dashboard/board/documents"
      budgetsHref="/dashboard/board/finances"
      pastAgms={pastAgms}
      relevantDocuments={relevantDocuments}
      linkedBudgets={linkedBudgets}
    />
  )
}
