import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ReportNavCards } from "@/components/reports/report-nav-cards"

export default async function BoardReportsPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-500 mt-1">
          A complete, exportable picture of your HOA - anytime, not tied to any one vendor.
        </p>
      </div>
      <ReportNavCards basePath="/dashboard/board/reports" />
    </div>
  )
}
