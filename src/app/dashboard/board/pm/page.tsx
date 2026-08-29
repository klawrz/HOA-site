import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { PMContractBoard } from "@/components/pm/pm-contract-board"
import { canPreviewRole } from "@/lib/role-access"

export default async function BoardPMPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  // This page is reachable both by a real Board Member AND an Account
  // Owner previewing the Board's section (canPreviewRole above) - `canManage`/
  // `canApprove` used to be hardcoded true for anyone who got this far,
  // which showed an "End Contract"/"Approve" button that would then fail
  // for a previewing Account Owner (real capacity checked server-side in
  // endPMContract/approvePMContract - Board-only, per Dara 2026-08-28).
  // Deriving these from the REAL role/isBoardMember here avoids showing
  // controls that are doomed to fail. Matches canManagePMContract/
  // canApprovePMContract in src/app/actions/pm.ts exactly (duplicated
  // per this codebase's existing convention of per-file permission checks).
  const isRealBoardMember = session.user.role === "BOARD_MEMBER" || session.user.isBoardMember
  const canManage = isRealBoardMember || session.user.role === "ACCOUNT_OWNER"

  const [contracts, companies, meetings] = await Promise.all([
    db.pMContract.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { company: { include: { emergencyContacts: true } }, createdBy: true, approvedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.propertyManagementCompany.findMany({ orderBy: { legalName: "asc" } }),
    db.meeting.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { date: "desc" } }),
  ])

  return (
    <PMContractBoard
      contracts={contracts}
      companies={companies.map((c) => ({ id: c.id, legalName: c.legalName }))}
      meetings={meetings.map((m) => ({ id: m.id, title: m.title, date: m.date }))}
      canManage={canManage}
      canApprove={isRealBoardMember}
    />
  )
}
