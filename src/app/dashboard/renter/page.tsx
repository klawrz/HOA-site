import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Home, TicketIcon, Phone, Mail, KeyRound } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn, formatDateTime, formatDateISO } from "@/lib/utils"
import { statusColor } from "@/lib/ticket-styles"
import { getUnitLabel } from "@/lib/unit-label"

export default async function RenterDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "RENTER") redirect("/dashboard")

  const [lease, unitLabel] = await Promise.all([
    db.lease.findFirst({
      where: { renterId: session.user.id, isActive: true },
      include: {
        unit: {
          include: {
            ownerships: { where: { isCurrent: true }, include: { owner: true } },
          },
        },
        payments: { orderBy: { dueDate: "desc" }, take: 6 },
      },
    }),
    getUnitLabel(session.user.orgId),
  ])

  const myTickets = await db.troubleTicket.findMany({
    where: { submittedById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Renter Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome, {session.user.name}</p>
      </div>

      {lease ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-500" />
              Your Unit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold">{unitLabel} {lease.unit.number}</p>
                {lease.unit.building && (
                  <p className="text-sm text-gray-500">Building {lease.unit.building}</p>
                )}
                <div className="flex gap-3 text-sm text-gray-500 mt-1">
                  {lease.unit.bedrooms && <span>{lease.unit.bedrooms} bedrooms</span>}
                  {lease.unit.bathrooms && <span>{lease.unit.bathrooms} bathrooms</span>}
                  {lease.unit.sqft && <span>{lease.unit.sqft.toLocaleString()} sqft</span>}
                </div>
              </div>
              {lease.monthlyRent && (
                <div className="text-right">
                  <p className="text-xl font-bold text-green-700">
                    ${lease.monthlyRent.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">per month</p>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              <span>Lease started {new Date(lease.startDate).toLocaleDateString()}</span>
              {lease.endDate && (
                <span> · Ends {new Date(lease.endDate).toLocaleDateString()}</span>
              )}
            </div>
            {lease.unit.ownerships[0]?.owner && (
              <div className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-xs font-medium text-gray-500 mb-1">Your Landlord</p>
                <p className="font-medium">{lease.unit.ownerships[0].owner.name}</p>
                <div className="flex flex-col gap-0.5 mt-1">
                  <a
                    href={`mailto:${lease.unit.ownerships[0].owner.email}`}
                    className="text-xs text-blue-600 flex items-center gap-1"
                  >
                    <Mail className="h-3 w-3" />
                    {lease.unit.ownerships[0].owner.email}
                  </a>
                  {lease.unit.ownerships[0].owner.phone && (
                    <a
                      href={`tel:${lease.unit.ownerships[0].owner.phone}`}
                      className="text-xs text-blue-600 flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {lease.unit.ownerships[0].owner.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
            {lease.unit.accessCode && (
              <div className="bg-gray-50 rounded-lg p-3 border flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Access Code</p>
                  <p className="font-medium">{lease.unit.accessCode}</p>
                  {lease.unit.accessCodeNotes && (
                    <p className="text-xs text-gray-400">{lease.unit.accessCodeNotes}</p>
                  )}
                </div>
              </div>
            )}
            {lease.payments.length > 0 && (
              <div className="border rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Recent Rent Payments</p>
                <div className="space-y-1.5">
                  {lease.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span>
                        ${p.amount.toLocaleString()}
                        <span className="text-xs text-gray-400 ml-2">Due {formatDateISO(p.dueDate)}</span>
                      </span>
                      {p.paidAt ? (
                        <span className="text-xs text-green-600">Paid {formatDateISO(p.paidAt)}</span>
                      ) : (
                        <span className="text-xs text-amber-600">Unpaid</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            <Home className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No active lease found. Contact the property manager.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TicketIcon className="h-4 w-4 text-orange-500" />
            My Recent Tickets
          </CardTitle>
          <Link href="/dashboard/renter/tickets/new" className={cn(buttonVariants({ size: "sm" }))}>+ New Ticket</Link>
        </CardHeader>
        <CardContent>
          {myTickets.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No tickets yet. Submit one if you have an issue.
            </p>
          ) : (
            <div className="space-y-2">
              {myTickets.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <Badge className={`text-xs ${statusColor[t.status]}`}>
                    {t.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
