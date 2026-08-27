import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SetupStatusCard } from "@/components/dashboard/setup-status-card"
import {
  getPMSetupStatus,
  getVerificationSetupStatus,
  getDuesSetupStatus,
  getBudgetSetupStatus,
  getBoardRosterSetupStatus,
  getUnitManagerSetupStatus,
} from "@/lib/setup-status"

export default async function SetupStatusPage() {
  const session = await auth()
  const canView =
    session?.user.orgId &&
    (session.user.role === "ACCOUNT_OWNER" || session.user.role === "BOARD_MEMBER" || session.user.isBoardMember)
  if (!canView) redirect("/dashboard")
  const orgId = session.user.orgId as string

  const [pm, verification, dues, budget, boardRoster, unitManager] = await Promise.all([
    getPMSetupStatus(orgId),
    getVerificationSetupStatus(orgId),
    getDuesSetupStatus(orgId),
    getBudgetSetupStatus(orgId),
    getBoardRosterSetupStatus(orgId),
    getUnitManagerSetupStatus(orgId),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Setup Status</h1>
        <p className="text-gray-500 text-sm mt-1">
          Where this workspace stands on the setup that spans more than one person - and who needs to act next.
        </p>
      </div>

      {session.user.role === "ACCOUNT_OWNER" && (
        <Link
          href="/onboarding"
          className="flex items-center justify-between gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-900 hover:bg-purple-100 transition-colors"
        >
          <span>
            Units, Owners, Board, and PM can each be set up in any order from the sidebar - prefer a guided
            walkthrough instead? Revisit the setup wizard.
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="space-y-3">
        <SetupStatusCard title="Workspace Verification" status={verification} />
        <SetupStatusCard title="Property Manager" status={pm} />
        <SetupStatusCard title="Board Roster" status={boardRoster} />
        <SetupStatusCard title="Operating Budget" status={budget} />
        <SetupStatusCard title="Dues & Assessments" status={dues} />
        <SetupStatusCard title="Unit Manager Delegation" status={unitManager} />
      </div>
    </div>
  )
}
