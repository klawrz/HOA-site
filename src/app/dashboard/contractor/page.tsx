import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketIcon, FileText, CheckCircle2 } from "lucide-react"
import { UpdateTicketStatusForm } from "./update-status-form"
import { BusinessProfileForm } from "./business-profile-form"
import { formatDateTime } from "@/lib/utils"
import { priorityColor, scopeLabel } from "@/lib/ticket-styles"

export default async function ContractorDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "CONTRACTOR") redirect("/dashboard")

  const me = await db.user.findUnique({ where: { id: session.user.id } })

  const assignments = await db.ticketAssignment.findMany({
    where: { contractorId: session.user.id },
    include: {
      ticket: {
        include: { unit: true, submittedBy: true },
      },
    },
    orderBy: { assignedAt: "desc" },
  })

  const activeAssignments = assignments.filter(
    (a) => a.ticket.status === "OPEN" || a.ticket.status === "IN_PROGRESS"
  )
  const completedAssignments = assignments.filter(
    (a) => a.ticket.status === "RESOLVED" || a.ticket.status === "CLOSED"
  )

  const contracts = await db.contract.findMany({
    where: { contractorId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contractor Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome, {session.user.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Profile</CardTitle>
          <p className="text-xs text-gray-400">
            Your service type helps Property Managers and the Board find you for the right kind of work.
          </p>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm company={me?.company ?? null} phone={me?.phone ?? null} category={me?.category ?? null} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TicketIcon className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{activeAssignments.length}</p>
                <p className="text-xs text-gray-500">Active Work Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedAssignments.length}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{contracts.length}</p>
                <p className="text-xs text-gray-500">Contracts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No active work orders assigned.
            </p>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((a) => (
                <div
                  key={a.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[a.ticket.priority]}`}>
                          {a.ticket.priority}
                        </span>
                      </div>
                      <p className="font-semibold">{a.ticket.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{a.ticket.description}</p>
                      <div className="flex gap-3 text-xs text-gray-400 mt-2">
                        <span>{a.ticket.unit ? `Unit ${a.ticket.unit.number}` : scopeLabel[a.ticket.scope]}</span>
                        <span>
                          Reported by {a.ticket.submittedBy.name ?? a.ticket.submittedBy.email} on {formatDateTime(a.ticket.createdAt)}
                        </span>
                        <span>Assigned {formatDateTime(a.assignedAt)}</span>
                      </div>
                      {a.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">Note: {a.notes}</p>
                      )}
                    </div>
                    <UpdateTicketStatusForm
                      ticketId={a.ticket.id}
                      currentStatus={a.ticket.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {contracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My HOA Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.startDate).toLocaleDateString()}
                      {c.endDate && ` – ${new Date(c.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.amount && (
                      <span className="text-sm font-medium">
                        ${c.amount.toLocaleString()}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
