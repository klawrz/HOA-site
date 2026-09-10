import { requireOwnerAccess } from "@/lib/require-owner-access"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn, formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor, statusLabel, scopeLabel } from "@/lib/ticket-styles"
import { canEditTicketRecord } from "@/lib/ticket-access"
import { formatMoney } from "@/lib/currency"
import { TicketStatusControls } from "@/app/dashboard/_components/ticket-status-controls"
import { TicketDetailsEditor } from "@/app/dashboard/_components/ticket-details-editor"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"

export default async function OwnerTicketsPage() {
  const session = await requireOwnerAccess()
  if (!session) redirect("/dashboard")

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id },
    select: { unitId: true },
  })
  const ownedUnitIds = ownerships.map((o) => o.unitId)

  const [tickets, unitLabel, ownMembership, org] = await Promise.all([
    db.troubleTicket.findMany({
      where: {
        OR: [
          { unitId: { in: ownedUnitIds } },
          { scope: "COMMON_AREA", orgId: session.user.orgId ?? undefined },
        ],
      },
      include: { unit: true, submittedBy: true },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
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
  const baseCurrency = org?.baseCurrency ?? "USD"
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("tickets")

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="tickets" alreadyComplete={onboardingStepDone} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trouble Tickets</h1>
          <p className="text-gray-500 mt-1">
            Requests for your units, plus common property requests
          </p>
        </div>
        <Link href="/dashboard/owner/tickets/new" className={cn(buttonVariants())}>
          New Request
        </Link>
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
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
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Submitted by {t.submittedBy.name ?? t.submittedBy.email} on {formatDateTime(t.createdAt)}
                  </p>
                  {t.costEstimate != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Estimated cost to resolve:{" "}
                      {formatMoney(t.costEstimate, t.costEstimateCurrency ?? baseCurrency)}
                      {(t.costEstimateCurrency ?? baseCurrency) !== "USD" &&
                        ` ${t.costEstimateCurrency ?? baseCurrency}`}
                      {t.costEstimateNote && ` — ${t.costEstimateNote}`}
                    </p>
                  )}
                </div>
                <TicketStatusControls
                  ticketId={t.id}
                  currentStatus={t.status}
                  canEditStatus={t.submittedById === session.user.id}
                  canEstimate={false}
                  costEstimate={t.costEstimate}
                  costEstimateNote={t.costEstimateNote}
                  costEstimateCurrency={t.costEstimateCurrency}
                  baseCurrency={baseCurrency}
                />
              </div>
            </CardContent>
          </Card>
        ))}
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
