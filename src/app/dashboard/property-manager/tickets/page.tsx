import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { TicketManageForm } from "@/app/dashboard/_components/ticket-manage-form"
import { TicketStatusControls } from "@/app/dashboard/_components/ticket-status-controls"
import { cn, formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor, statusLabel, scopeLabel } from "@/lib/ticket-styles"
import { canEditTicketRecord } from "@/lib/ticket-access"
import { TicketDetailsEditor } from "@/app/dashboard/_components/ticket-details-editor"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"
import { canPreviewRole } from "@/lib/role-access"

export default async function AllTicketsPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [tickets, contractorMemberships, unitLabel, ownMembership, orgForCurrency] = await Promise.all([
    db.troubleTicket.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: {
        unit: true,
        submittedBy: true,
        assignments: { include: { contractor: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    db.membership.findMany({
      where: { orgId: session.user.orgId ?? undefined, role: "CONTRACTOR" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    getUnitLabel(session.user.orgId),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
    db.organization.findUnique({
      where: { id: session.user.orgId ?? undefined },
      select: { baseCurrency: true },
    }),
  ])
  const contractors = contractorMemberships.map((m) => m.user)
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("pm_tickets")
  const baseCurrency = orgForCurrency?.baseCurrency ?? "USD"

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="pm_tickets" alreadyComplete={onboardingStepDone} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Trouble Tickets</h1>
          <p className="text-gray-500 mt-1">{tickets.length} total tickets</p>
        </div>
        <Link href="/dashboard/property-manager/tickets/new" className={cn(buttonVariants())}>
          New Request
        </Link>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => {
          const assigned = t.assignments[t.assignments.length - 1]
          return (
            <Card key={t.id}>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[t.priority]}`}>
                        {t.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status]}`}>
                        {statusLabel[t.status] ?? t.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                        {t.unit ? unitDisplayName(unitLabel, t.unit.number, t.unit.building) : scopeLabel[t.scope]}
                      </span>
                    </div>
                    <TicketDetailsEditor
                      ticketId={t.id}
                      title={t.title}
                      description={t.description}
                      canEdit={canEditTicketRecord(session.user, t)}
                      clampDescription
                    />
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                      <span>Submitted by {t.submittedBy.name ?? t.submittedBy.email} on {formatDateTime(t.createdAt)}</span>
                    </div>
                    {assigned && (
                      <p className="text-xs text-blue-600 mt-1">
                        Assigned to {assigned.contractor.name ?? assigned.contractor.email}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <TicketStatusControls
                      ticketId={t.id}
                      currentStatus={t.status}
                      canEditStatus
                      canEstimate
                      costEstimate={t.costEstimate}
                      costEstimateNote={t.costEstimateNote}
                      costEstimateCurrency={t.costEstimateCurrency}
                      baseCurrency={baseCurrency}
                    />
                    {t.status !== "CLOSED" && (
                      <TicketManageForm
                        ticketId={t.id}
                        contractors={contractors}
                        currentContractorId={assigned?.contractorId}
                        currentPriority={t.priority}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {tickets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No tickets yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
