import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { TicketManageForm } from "@/app/dashboard/_components/ticket-manage-form"
import { cn, formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor, scopeLabel } from "@/lib/ticket-styles"

export default async function AllTicketsPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const [tickets, contractorMemberships] = await Promise.all([
    db.troubleTicket.findMany({
      include: {
        unit: true,
        submittedBy: true,
        assignments: { include: { contractor: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    db.membership.findMany({ where: { role: "CONTRACTOR" }, include: { user: true }, orderBy: { user: { name: "asc" } } }),
  ])
  const contractors = contractorMemberships.map((m) => m.user)

  return (
    <div className="space-y-6">
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
                        {t.status.replace("_", " ")}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                        {t.unit ? `Unit ${t.unit.number}` : scopeLabel[t.scope]}
                      </span>
                    </div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                      <span>Submitted by {t.submittedBy.name ?? t.submittedBy.email} on {formatDateTime(t.createdAt)}</span>
                    </div>
                    {assigned && (
                      <p className="text-xs text-blue-600 mt-1">
                        Assigned to {assigned.contractor.name ?? assigned.contractor.email}
                      </p>
                    )}
                  </div>
                  {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                    <TicketManageForm
                      ticketId={t.id}
                      contractors={contractors}
                      currentContractorId={assigned?.contractorId}
                      currentPriority={t.priority}
                    />
                  )}
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
