import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmConsoleData } from "@/lib/agm"
import { AgmManager } from "@/components/agm/agm-manager"
import { AgmEmptyState } from "@/components/agm/agm-empty-state"

export default async function BoardAgmPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  const canManage =
    session.user.role === "BOARD_MEMBER" ||
    session.user.role === "ACCOUNT_OWNER" ||
    session.user.role === "PROPERTY_MANAGER" ||
    session.user.isBoardMember === true

  const { agm, ownerByUnit, tally, nextYear, checklist } = await getAgmConsoleData(session.user.orgId ?? "")

  if (!agm || !tally) return <AgmEmptyState canManage={canManage} defaultYear={nextYear} />

  return (
    <AgmManager
      agm={JSON.parse(JSON.stringify(agm))}
      tally={tally}
      ownerByUnit={ownerByUnit}
      canManage={canManage}
      docBasePath="/dashboard/board/agm"
      checklist={checklist}
    />
  )
}
