import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  // A platform admin with no org memberships has nothing to see here -
  // send them to their own console instead of a dashboard with no org.
  if (!session.user.orgId || !session.user.role) {
    redirect(session.user.isPlatformAdmin ? "/platform-admin" : "/login")
  }

  const org = await db.organization.findUnique({ where: { id: session.user.orgId } })
  if (org && !org.onboardingComplete && session.user.role === "ACCOUNT_OWNER") {
    redirect("/onboarding")
  }

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    include: { org: { select: { id: true, name: true } } },
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <DashboardSidebar role={session.user.role} isBoardMember={session.user.isBoardMember} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader
          user={session.user}
          orgName={org?.name ?? ""}
          isPlatformAdmin={session.user.isPlatformAdmin}
          otherOrgs={memberships
            .filter((m) => m.orgId !== session.user.orgId)
            .map((m) => ({ orgId: m.org.id, orgName: m.org.name, role: m.role }))}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
