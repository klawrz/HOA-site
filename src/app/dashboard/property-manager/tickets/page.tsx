import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { AssignTicketForm } from "./assign-ticket-form"

const priorityColor: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-600",
}

const statusColor: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
}

export default async function AllTicketsPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const [tickets, contractors] = await Promise.all([
    db.troubleTicket.findMany({
      include: {
        unit: true,
        submittedBy: true,
        assignments: { include: { contractor: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    db.user.findMany({ where: { role: "CONTRACTOR" }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Trouble Tickets</h1>
        <p className="text-gray-500 mt-1">{tickets.length} total tickets</p>
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
                    </div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                      <span>Unit {t.unit.number}</span>
                      <span>Submitted by {t.submittedBy.name ?? t.submittedBy.email}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                    {assigned && (
                      <p className="text-xs text-blue-600 mt-1">
                        Assigned to {assigned.contractor.name ?? assigned.contractor.email}
                      </p>
                    )}
                  </div>
                  {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                    <AssignTicketForm
                      ticketId={t.id}
                      contractors={contractors}
                      currentContractorId={assigned?.contractorId}
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
