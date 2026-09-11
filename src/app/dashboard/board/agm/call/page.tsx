import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmCallRoster } from "@/lib/agm"
import { CallRoster } from "./call-roster"

// Board/PM "send the call": the 2013 Regime requires the HOA to
// proactively issue the call notice, not just leave it for owners to
// self-serve. This page generates a no-login link per unit to that unit's
// own personalized package and tracks who has opened theirs.
export default async function AgmCallPage() {
  const session = await auth()
  const canManage =
    session?.user &&
    (canPreviewRole(session.user.role, "BOARD_MEMBER") ||
      canPreviewRole(session.user.role, "PROPERTY_MANAGER") ||
      session.user.isBoardMember === true)
  if (!session || !canManage) redirect("/dashboard")

  const roster = await getAgmCallRoster(session.user.orgId ?? "")
  if (!roster) redirect("/dashboard/board/agm")

  const sent = roster.rows.some((r) => r.sentAt)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <Link
          href="/dashboard/board/agm"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the AGM
        </Link>
        <h1 className="text-2xl font-bold">Send the call — AGM {roster.agmYear}</h1>
        <p className="text-gray-500 mt-1">
          Every unit gets a personal, no-login link to their own package. Copy links individually,
          export them all, or open one to see exactly what an owner sees.
        </p>
      </div>
      <CallRoster rows={roster.rows} sent={sent} />
    </div>
  )
}
