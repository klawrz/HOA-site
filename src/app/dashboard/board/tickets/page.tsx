import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { buttonVariants } from "@/components/ui/button"
import { TicketsList, type TicketRow } from "@/app/dashboard/_components/tickets-list"
import { cn } from "@/lib/utils"
import { scopeLabel } from "@/lib/ticket-styles"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { canPreviewRole } from "@/lib/role-access"

export default async function BoardTicketsPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  const [tickets, contractorMemberships, unitLabel] = await Promise.all([
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
  ])
  const contractors = contractorMemberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    company: m.user.company,
  }))

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
      // Board assign/prioritise authority is limited to common-property
      // requests - unit tickets are the PM's to manage.
      canManage: t.scope === "COMMON_AREA",
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Trouble Tickets</h1>
          <p className="text-gray-500 mt-1">
            {tickets.length} total — full HOA oversight. Assign/prioritize authority is limited to common
            property requests.
          </p>
        </div>
        <Link href="/dashboard/board/tickets/new" className={cn(buttonVariants())}>
          New Request
        </Link>
      </div>

      <TicketsList tickets={rows} contractors={contractors} />
    </div>
  )
}
