import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canPreviewRole } from "@/lib/role-access"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { loadCurrentAgm, getDuesCurrentUnitIds } from "@/lib/agm"
import { AgmDetailContent } from "@/components/key-info/agm-detail-content"
import { OwnerAgmView, type OwnerVilla } from "@/components/agm/owner-agm-view"

export default async function OwnerAgmPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "OWNER")) redirect("/dashboard")
  const orgId = session.user.orgId ?? ""

  const agm = await loadCurrentAgm(orgId)

  // No AGM in the new model yet - keep the original KeyDate-backed view so
  // nothing regresses for orgs that haven't set one up.
  if (!agm) {
    const keyDate = await db.keyDate.findUnique({ where: { orgId_type: { orgId, type: "AGM" } } })
    const [pastAgms, relevantDocuments, linkedBudgets] = await Promise.all([
      db.meeting.findMany({
        where: { orgId, type: "AGM", ...(keyDate?.meetingId ? { id: { not: keyDate.meetingId } } : {}) },
        orderBy: { date: "desc" },
        take: 5,
        select: { id: true, title: true, date: true, minutes: true },
      }),
      keyDate?.meetingId
        ? db.document.findMany({
            where: { meetingId: keyDate.meetingId },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, category: true, fileUrl: true },
          })
        : Promise.resolve([]),
      keyDate?.meetingId
        ? db.budget.findMany({
            where: { meetingId: keyDate.meetingId },
            orderBy: { year: "desc" },
            select: { id: true, year: true, version: true, status: true, approvedAt: true },
          })
        : Promise.resolve([]),
    ])
    const canManage = session.user.role === "ACCOUNT_OWNER" || session.user.isBoardMember === true
    return (
      <AgmDetailContent
        agm={keyDate}
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

  const [ownerships, unitLabel, duesCurrent] = await Promise.all([
    db.unitOwnership.findMany({
      where: { ownerId: session.user.id, isCurrent: true, unit: { orgId } },
      include: { unit: true },
    }),
    getUnitLabel(orgId),
    getDuesCurrentUnitIds(orgId),
  ])

  const byUnit = new Map(agm.participation.map((p) => [p.unitId, p]))
  const myVillas: OwnerVilla[] = ownerships.map((o) => {
    const p = byUnit.get(o.unitId)
    const reviewed = p?.eligibleToVote != null
    return {
      unitId: o.unitId,
      label: unitDisplayName(unitLabel, o.unit.number),
      status: p?.status ?? "NO_RESPONSE",
      eligible: reviewed ? Boolean(p!.eligibleToVote) : duesCurrent.has(o.unitId),
      eligibilityReviewed: reviewed,
      eligibilityNote: p?.eligibilityNote ?? null,
      proxyHolderName: p?.proxyHolderName ?? null,
      proxyHolderType: p?.proxyHolderType ?? null,
      proxyDocsComplete: Boolean(p?.proxyRegimeDocUrl && p?.proxyCivilDocUrl && p?.proxyIdDocUrl),
      proxyVerified: Boolean(p?.proxyVerifiedOn),
      respondedAt: p?.respondedAt ? p.respondedAt.toISOString() : null,
    }
  })

  return (
    <OwnerAgmView
      agm={JSON.parse(JSON.stringify(agm))}
      myVillas={myVillas}
      backHref="/dashboard/owner/governance"
    />
  )
}
