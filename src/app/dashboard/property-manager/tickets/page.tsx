import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { buttonVariants } from "@/components/ui/button"
import { TicketsList, type TicketRow } from "@/app/dashboard/_components/tickets-list"
import { cn } from "@/lib/utils"
import { scopeLabel } from "@/lib/ticket-styles"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"
import { canPreviewRole } from "@/lib/role-access"

export default async function AllTicketsPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [tickets, contractorMemberships, unitLabel, ownMembership] = await Promise.all([
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
  ])
  const contractors = contractorMemberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    company: m.user.company,
  }))
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("pm_tickets")

  const rows: TicketRow[] = tickets.map((t) => {
    const assigned = t.assignments[t.assignments.length - 1]
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      scopeOrUnit: t.unit ? unitDisplayName(unitLabel, t.unit.number, t.unit.building) : scopeLabel[t.scope],
      submittedByName: t.submittedBy.name ?? t.submittedBy.email ?? "—",
      createdAt: t.createdAt.toISOString(),
      assignedName: assigned ? assigned.contractor.name ?? assigned.contractor.email : null,
      assignedContractorId: assigned?.contractorId ?? null,
      canManage: true,
    }
  })

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

      <TicketsList tickets={rows} contractors={contractors} />
    </div>
  )
}
