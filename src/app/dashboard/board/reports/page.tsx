import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ReportNavCards } from "@/components/reports/report-nav-cards"
import { ArchivedReportsList } from "@/components/reports/archived-reports-list"
import { loadArchivedReports } from "@/lib/archived-reports"
import { canPreviewRole } from "@/lib/role-access"

export default async function BoardReportsPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  const reports = await loadArchivedReports(session.user.orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-500 mt-1">
          A complete, exportable picture of your HOA - anytime, not tied to any one vendor.
        </p>
      </div>
      <ReportNavCards basePath="/dashboard/board/reports" />
      <ArchivedReportsList reports={reports} />
    </div>
  )
}
