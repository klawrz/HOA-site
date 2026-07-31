import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Mail, Phone, Wrench } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor } from "@/lib/ticket-styles"
import { PMContractBoard } from "@/components/pm/pm-contract-board"

export default async function OwnerPropertyManagerPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const isBoardMember = session.user.isBoardMember

  if (isBoardMember) {
    const [contracts, companies, meetings] = await Promise.all([
      db.pMContract.findMany({
        where: { orgId: session.user.orgId ?? undefined },
        include: { company: { include: { emergencyContacts: true } }, createdBy: true, approvedBy: true },
        orderBy: { createdAt: "desc" },
      }),
      db.propertyManagementCompany.findMany({ orderBy: { legalName: "asc" } }),
      db.meeting.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { date: "desc" } }),
    ])

    return (
      <PMContractBoard
        contracts={contracts}
        companies={companies.map((c) => ({ id: c.id, legalName: c.legalName }))}
        meetings={meetings.map((m) => ({ id: m.id, title: m.title, date: m.date }))}
        canManage
        canApprove
      />
    )
  }

  const [pmContract, maintenanceTickets] = await Promise.all([
    db.pMContract.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "ACTIVE" },
      include: { company: true },
      orderBy: { startDate: "desc" },
    }),
    db.troubleTicket.findMany({
      where: { scope: "COMMON_AREA" },
      include: { submittedBy: true, assignments: { include: { contractor: true } } },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
  ])

  const company = pmContract?.company

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Property Manager</h1>
        <p className="text-gray-500 mt-1">Who manages your property, and updates on overall property maintenance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Management Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          {company ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold">{company.legalName}</p>
              {company.primaryContactName && (
                <p className="text-sm text-gray-600">Contact: {company.primaryContactName}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1">
                {(company.primaryContactEmail ?? company.email) && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {company.primaryContactEmail ?? company.email}
                  </span>
                )}
                {(company.primaryContactPhone ?? company.phone) && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {company.primaryContactPhone ?? company.phone}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No Property Manager currently under contract.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Property Maintenance Updates
          </CardTitle>
          <p className="text-xs text-gray-400">Common property requests, not tied to any single unit</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {maintenanceTickets.length === 0 && (
            <p className="text-sm text-gray-500">No common property maintenance requests on file.</p>
          )}
          {maintenanceTickets.map((t) => {
            const assigned = t.assignments[t.assignments.length - 1]
            return (
              <div key={t.id} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[t.priority]}`}>
                    {t.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status]}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Submitted by {t.submittedBy.name ?? t.submittedBy.email} on {formatDateTime(t.createdAt)}
                </p>
                {assigned && (
                  <p className="text-xs text-blue-600 mt-1">
                    Assigned to {assigned.contractor.name ?? assigned.contractor.email}
                  </p>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
