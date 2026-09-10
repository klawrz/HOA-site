import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { TicketIcon, CheckCircle2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor, scopeLabel } from "@/lib/ticket-styles"
import { getAttentionItems, attentionSeverityLabel } from "@/lib/attention"
import { PM_ONBOARDING_STEPS, PM_STEP_IDS, parseCompletedSteps, isOnboardingComplete } from "@/lib/onboarding-steps"
import { OnboardingChecklistCard } from "@/components/onboarding/onboarding-checklist-card"
import { PMReferralCard } from "@/components/dashboard/pm-referral-card"
import { canPreviewRole } from "@/lib/role-access"
import { greeting } from "@/lib/greeting"

const attentionSeverityColor: Record<string, string> = {
  expired: "bg-red-100 text-red-800",
  overdue: "bg-red-100 text-red-800",
  over_budget: "bg-amber-100 text-amber-800",
  expiring: "bg-amber-100 text-amber-800",
}

export default async function PropertyManagerDashboard() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [
    totalUnits,
    rentedUnits,
    openTickets,
    ownerCount,
    contractorCount,
    attentionItems,
    ownMembership,
    myReferrals,
  ] = await Promise.all([
    db.unit.count({ where: { orgId: session.user.orgId ?? undefined } }),
    db.unit.count({ where: { orgId: session.user.orgId ?? undefined, status: "RENTED" } }),
    db.troubleTicket.count({
      where: { orgId: session.user.orgId ?? undefined, status: { in: ["ACTIVE", "DEFERRED"] } },
    }),
    // Driven by UnitOwnership, not Membership.role === "OWNER" - a
    // custodian who claimed their own unit (see claimOwnUnit) stays an
    // ACCOUNT_OWNER membership but is a real owner, same reasoning as the
    // Owner Directory page below.
    db.user.count({
      where: { ownedUnits: { some: { isCurrent: true, unit: { orgId: session.user.orgId ?? undefined } } } },
    }),
    db.membership.count({ where: { orgId: session.user.orgId ?? undefined, role: "CONTRACTOR" } }),
    session.user.orgId ? getAttentionItems(session.user.orgId, "/dashboard/property-manager") : Promise.resolve([]),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
    db.pMReferral.findMany({
      where: { referredById: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, propertyName: true, estimatedUnits: true, status: true, createdAt: true },
    }),
  ])
  const completedSteps = parseCompletedSteps(ownMembership?.onboardingSteps ?? null)
  const onboardingDone = isOnboardingComplete(ownMembership?.onboardingSteps ?? null, PM_STEP_IDS)

  const recentTickets = await db.troubleTicket.findMany({
    where: { orgId: session.user.orgId ?? undefined, status: { in: ["ACTIVE", "DEFERRED"] } },
    include: { unit: true, submittedBy: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  })

  return (
    <div className="space-y-6">
      {/* "As Property Manager..." - same treatment as the Owner home page:
          a greeting, a priorities list (open tickets + everything
          getAttentionItems already flags - expiring contracts/compliance
          docs, overdue assessments, budget overage), and a tight stats
          strip. Replaces the old plain header + a separate 4-card stat
          grid + a standalone Needs Attention panel below, which just
          repeated the same numbers in more space. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">As Property Manager...</CardTitle>
          <p className="text-xs text-gray-400">{greeting()}.</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {openTickets === 0 && attentionItems.length === 0 ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Everything&apos;s quiet - no open tickets,
              nothing expiring or overdue.
            </p>
          ) : (
            <div className="space-y-2">
              {openTickets > 0 && (
                <Link
                  href="/dashboard/property-manager/tickets"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:underline"
                >
                  <TicketIcon className="h-4 w-4 text-orange-500 shrink-0" />
                  {openTickets} open ticket{openTickets !== 1 ? "s" : ""}
                </Link>
              )}
              {attentionItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.detail}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${attentionSeverityColor[item.severity]}`}
                  >
                    {attentionSeverityLabel[item.severity]}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 border-t pt-3 text-center text-xs">
            <Link href="/dashboard/property-manager/units" className="rounded-lg hover:bg-gray-50 py-1.5">
              <p className="text-lg font-bold leading-none">{totalUnits}</p>
              <p className="text-gray-400 mt-0.5">Units</p>
            </Link>
            <div className="rounded-lg py-1.5">
              <p className="text-lg font-bold leading-none">{rentedUnits}</p>
              <p className="text-gray-400 mt-0.5">Rented</p>
            </div>
            <Link href="/dashboard/property-manager/owners" className="rounded-lg hover:bg-gray-50 py-1.5">
              <p className="text-lg font-bold leading-none">{ownerCount}</p>
              <p className="text-gray-400 mt-0.5">Owners</p>
            </Link>
            <Link href="/dashboard/property-manager/contractors" className="rounded-lg hover:bg-gray-50 py-1.5">
              <p className="text-lg font-bold leading-none">{contractorCount}</p>
              <p className="text-gray-400 mt-0.5">Contractors</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      <OnboardingChecklistCard
        steps={PM_ONBOARDING_STEPS}
        completedIds={completedSteps}
        allComplete={onboardingDone}
        welcomeSeen={completedSteps.has("welcome_seen")}
        completionTitle="You're set up to run this community."
        completionMessage="You know the finances, where tickets come in, and who's in your contractor directory. Welcome aboard."
      />

      <PMReferralCard referrals={myReferrals} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Trouble Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No open tickets</p>
          ) : (
            <div className="space-y-2">
              {recentTickets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.title}</p>
                    <p className="text-xs text-gray-500">
                      {t.unit ? `Unit ${t.unit.number}` : scopeLabel[t.scope]} · Submitted by {t.submittedBy.name ?? t.submittedBy.email} on {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[t.priority]}`}
                    >
                      {t.priority}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status]}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
