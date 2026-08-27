import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { SuspendedNotice } from "@/components/dashboard/suspended-notice"
import { OrgDeletionBanner } from "@/components/dashboard/org-deletion-banner"
import { ProvisionalWorkspaceBanner } from "@/components/dashboard/provisional-workspace-banner"
import { getUnitsSetupStatus, getMembersSetupStatus, getBoardRosterSetupStatus, getPMSetupStatus } from "@/lib/setup-status"

export async function generateMetadata() {
  const session = await auth()
  if (!session?.user.orgId) return { title: "HOPE" }
  const org = await db.organization.findUnique({ where: { id: session.user.orgId }, select: { name: true } })
  return { title: org ? `${org.name} - HOPE` : "HOPE" }
}

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

  // Deliberately not gating dashboard access on onboardingComplete - the
  // custodian should be able to set up units, owners, board, and PM in
  // whatever order they actually have the paperwork for (see the sidebar's
  // four independent "Setup X" links + checkmarks in setup-status.ts),
  // rather than being forced through /onboarding's fixed Units-then-Owners
  // sequence before touching anything else. The wizard stays reachable as
  // an optional guided path (linked from the Setup Status page) for anyone
  // who wants it; completeOnboarding() is just a "did the guided pass"
  // marker now, not a hard prerequisite.

  const [memberships, pendingDeletionRequest, ownsUnit, setupProgress] = await Promise.all([
    db.membership.findMany({
      where: { userId: session.user.id },
      include: { org: { select: { id: true, name: true } } },
    }),
    db.orgDeletionRequest.findFirst({ where: { orgId: session.user.orgId, status: "PENDING" } }),
    session.user.role === "ACCOUNT_OWNER"
      ? db.unitOwnership
          .count({ where: { ownerId: session.user.id, isCurrent: true, unit: { orgId: session.user.orgId } } })
          .then((c) => c > 0)
      : Promise.resolve(false),
    // Sidebar checkmarks for the custodian, so each step's completion is
    // visible without a trip to the Setup Status page - only queried for
    // ACCOUNT_OWNER since no other role sees these nav items.
    session.user.role === "ACCOUNT_OWNER"
      ? Promise.all([
          getUnitsSetupStatus(session.user.orgId),
          getMembersSetupStatus(session.user.orgId),
          getBoardRosterSetupStatus(session.user.orgId),
          getPMSetupStatus(session.user.orgId),
        ]).then(([units, members, board, pm]) => ({
          units: units.state === "done",
          // Unlike the other three, "done" for Owners depends on someone
          // ELSE accepting an invite - not something the custodian can force.
          // Staging owners on the roster (see PendingOwner) or sending an
          // invite is the custodian's actual, real work here; gating the
          // checkmark and the Board/PM reveal on a stranger's action made it
          // look like real progress had vanished, so "not started" is the
          // only state this treats as not-yet-done.
          members: members.state !== "not_started",
          board: board.state === "done",
          pm: pm.state === "done",
        }))
      : Promise.resolve(undefined),
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
      <DashboardSidebar
        role={session.user.role}
        isBoardMember={session.user.isBoardMember}
        orgName={org?.name ?? ""}
        ownsUnit={ownsUnit}
        setupProgress={setupProgress}
      />
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
          {org && org.verificationStatus === "PROVISIONAL" && (
            <ProvisionalWorkspaceBanner
              orgName={org.name}
              verificationHref="/dashboard/account/verification"
              role={session.user.role}
            />
          )}
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
