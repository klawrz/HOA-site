import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Wrench, TicketIcon } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor, scopeLabel } from "@/lib/ticket-styles"
import { getAttentionItems } from "@/lib/attention"
import { NeedsAttentionPanel } from "@/components/dashboard/needs-attention-panel"
import { PM_ONBOARDING_STEPS, PM_STEP_IDS, parseCompletedSteps, isOnboardingComplete } from "@/lib/onboarding-steps"
import { OnboardingChecklistCard } from "@/components/onboarding/onboarding-checklist-card"
import { PMReferralCard } from "@/components/dashboard/pm-referral-card"

export default async function PropertyManagerDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const [
    totalUnits,
    availableUnits,
    rentedUnits,
    openTickets,
    ownerCount,
    contractorCount,
    attentionItems,
    ownMembership,
    myReferrals,
  ] = await Promise.all([
    db.unit.count({ where: { orgId: session.user.orgId ?? undefined } }),
    db.unit.count({ where: { orgId: session.user.orgId ?? undefined, status: "AVAILABLE" } }),
    db.unit.count({ where: { orgId: session.user.orgId ?? undefined, status: "RENTED" } }),
    db.troubleTicket.count({
      where: { orgId: session.user.orgId ?? undefined, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.membership.count({ where: { orgId: session.user.orgId ?? undefined, role: "OWNER" } }),
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
    where: { orgId: session.user.orgId ?? undefined, status: { in: ["OPEN", "IN_PROGRESS"] } },
    include: { unit: true, submittedBy: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Manager Dashboard</h1>
        <p className="text-gray-500 mt-1">Community overview at a glance</p>
      </div>

      <OnboardingChecklistCard
        steps={PM_ONBOARDING_STEPS}
        completedIds={completedSteps}
        allComplete={onboardingDone}
        welcomeSeen={completedSteps.has("welcome_seen")}
        completionTitle="You're set up to run this community."
        completionMessage="You know the finances, where tickets come in, and who's in your contractor directory. Welcome aboard."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalUnits}</p>
                <p className="text-xs text-gray-500">Total Units</p>
              </div>
            </div>
            <div className="mt-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-green-600">Available</span>
                <span className="font-medium">{availableUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Rented</span>
                <span className="font-medium">{rentedUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner Occupied</span>
                <span className="font-medium">{totalUnits - availableUnits - rentedUnits}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TicketIcon className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{openTickets}</p>
                <p className="text-xs text-gray-500">Open Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{ownerCount}</p>
                <p className="text-xs text-gray-500">Owners</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Wrench className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{contractorCount}</p>
                <p className="text-xs text-gray-500">Contractors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <NeedsAttentionPanel items={attentionItems} />

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
