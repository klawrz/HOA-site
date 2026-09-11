import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { listBoardIssues } from "@/lib/board-issues"
import { BoardIssuesManager, type BoardIssueView } from "@/components/board/board-issues-manager"

export default async function PmIssuesPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const canManage =
    session.user.role === "PROPERTY_MANAGER" ||
    session.user.role === "BOARD_MEMBER" ||
    session.user.role === "ACCOUNT_OWNER" ||
    session.user.isBoardMember === true

  const issues = await listBoardIssues(session.user.orgId ?? "")

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pending matters</h1>
        <p className="text-gray-500 text-sm mt-1">
          Legal, tax, compliance, financial and property items you and the Board are working through —
          and a record of what has been completed.
        </p>
      </div>
      <BoardIssuesManager
        issues={JSON.parse(JSON.stringify(issues)) as BoardIssueView[]}
        canManage={canManage}
      />
    </div>
  )
}
