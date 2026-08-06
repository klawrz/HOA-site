import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { SuspendedNotice } from "@/components/dashboard/suspended-notice"
import { OrgDeletionBanner } from "@/components/dashboard/org-deletion-banner"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  // A platform admin with no org memberships has nothing to see here -
  // send them to their own console instead of a dashboard with no org.
  if (!session.user.orgId || !session.user.role) {
    redirect(session.user.isPlatformAdmin ? "/platform-admin" : "/login")
  }

  const org = await db.organization.findUnique({ where: { id: session.user.orgId } })

  // A suspended org locks out every member, including the Account Owner -
  // total, not conditional on onboarding state - but never a platform
  // admin, who needs to be able to get back in to unsuspend it.
  if (org?.suspendedAt && !session.user.isPlatformAdmin) {
    return <SuspendedNotice orgName={org.name} />
  }

  if (org && !org.onboardingComplete && session.user.role === "ACCOUNT_OWNER") {
    redirect("/onboarding")
  }

  const [memberships, pendingDeletionRequest] = await Promise.all([
    db.membership.findMany({
      where: { userId: session.user.id },
      include: { org: { select: { id: true, name: true } } },
    }),
    db.orgDeletionRequest.findFirst({ where: { orgId: session.user.orgId, status: "PENDING" } }),
  ])

  const isAccountOwnerSlotOpen =
    session.user.role === "ACCOUNT_OWNER" && !pendingDeletionRequest?.accountOwnerApprovedAt
  const isBoardMember = session.user.role === "BOARD_MEMBER" || session.user.isBoardMember === true
  const isBoardMemberSlotOpen =
    isBoardMember &&
    !pendingDeletionRequest?.boardMemberApprovedAt &&
    pendingDeletionRequest?.accountOwnerApprovedById !== session.user.id
  const alreadyApprovedByMe =
    pendingDeletionRequest?.accountOwnerApprovedById === session.user.id ||
    pendingDeletionRequest?.boardMemberApprovedById === session.user.id

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DashboardSidebar role={session.user.role} isBoardMember={session.user.isBoardMember} orgName={org?.name ?? ""} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          user={session.user}
          orgName={org?.name ?? ""}
          isPlatformAdmin={session.user.isPlatformAdmin}
          otherOrgs={memberships
            .filter((m) => m.orgId !== session.user.orgId)
            .map((m) => ({ orgId: m.org.id, orgName: m.org.name, role: m.role }))}
        />
        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible">
          {pendingDeletionRequest && (
            <OrgDeletionBanner
              requestId={pendingDeletionRequest.id}
              orgName={org?.name ?? pendingDeletionRequest.orgName}
              canRespond={!!(isAccountOwnerSlotOpen || isBoardMemberSlotOpen)}
              alreadyApprovedByMe={!!alreadyApprovedByMe}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
