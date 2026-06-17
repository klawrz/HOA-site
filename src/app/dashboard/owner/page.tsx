import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, TicketIcon, DollarSign } from "lucide-react"
import { RentalPolicyForm } from "./rental-policy-form"

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OWNER_OCCUPIED: "bg-blue-100 text-blue-800",
    RENTED: "bg-green-100 text-green-800",
    AVAILABLE: "bg-emerald-100 text-emerald-800",
    UNAVAILABLE: "bg-gray-100 text-gray-600",
  }
  const labels: Record<string, string> = {
    OWNER_OCCUPIED: "Owner Occupied",
    RENTED: "Rented",
    AVAILABLE: "Available",
    UNAVAILABLE: "Unavailable",
  }
  return { color: map[status] ?? "bg-gray-100 text-gray-600", label: labels[status] ?? status }
}

function ticketBadge(status: string) {
  const map: Record<string, string> = {
    OPEN: "bg-yellow-100 text-yellow-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    RESOLVED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-600",
  }
  return map[status] ?? "bg-gray-100 text-gray-600"
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-800",
    HIGH: "bg-orange-100 text-orange-800",
    URGENT: "bg-red-100 text-red-800",
  }
  return map[p] ?? "bg-gray-100"
}

export default async function OwnerDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id },
    include: {
      unit: {
        include: {
          leases: { where: { isActive: true }, include: { renter: true } },
          tickets: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      },
    },
  })

  const totalTickets = ownerships.flatMap((o) => o.unit.tickets).length
  const activeLeases = ownerships.flatMap((o) => o.unit.leases).filter((l) => l.isActive).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {session.user.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{ownerships.length}</p>
                <p className="text-xs text-gray-500">Units Owned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeLeases}</p>
                <p className="text-xs text-gray-500">Active Renters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TicketIcon className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalTickets}</p>
                <p className="text-xs text-gray-500">Trouble Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  ${ownerships
                    .flatMap((o) => o.unit.leases)
                    .filter((l) => l.isActive && l.monthlyRent)
                    .reduce((s, l) => s + (l.monthlyRent ?? 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Monthly Rent Income</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {ownerships.map((ownership) => {
        const { unit } = ownership
        const activeLease = unit.leases[0]
        const sb = statusBadge(unit.status)

        return (
          <Card key={unit.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Unit {unit.number}
                  {unit.building && ` — Building ${unit.building}`}
                </CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sb.color}`}>
                  {sb.label}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-500 mt-1">
                {unit.bedrooms && <span>{unit.bedrooms} bed</span>}
                {unit.bathrooms && <span>{unit.bathrooms} bath</span>}
                {unit.sqft && <span>{unit.sqft.toLocaleString()} sqft</span>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <RentalPolicyForm
                ownershipId={ownership.id}
                unitId={unit.id}
                currentPolicy={ownership.rentalPolicy}
                currentNotes={ownership.notes ?? ""}
              />

              {activeLease && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-sm font-medium text-green-800 mb-1">Current Renter</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{activeLease.renter.name}</p>
                      <p className="text-xs text-gray-500">{activeLease.renter.email}</p>
                      {activeLease.renter.phone && (
                        <p className="text-xs text-gray-500">{activeLease.renter.phone}</p>
                      )}
                    </div>
                    {activeLease.monthlyRent && (
                      <p className="text-sm font-bold text-green-700">
                        ${activeLease.monthlyRent.toLocaleString()}/mo
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Since {new Date(activeLease.startDate).toLocaleDateString()}
                    {activeLease.endDate &&
                      ` · Until ${new Date(activeLease.endDate).toLocaleDateString()}`}
                  </p>
                </div>
              )}

              {unit.tickets.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Tickets</p>
                  <div className="space-y-2">
                    {unit.tickets.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2"
                      >
                        <span className="truncate flex-1 mr-2">{t.title}</span>
                        <div className="flex gap-1 shrink-0">
                          <Badge className={`text-xs ${priorityBadge(t.priority)}`}>
                            {t.priority}
                          </Badge>
                          <Badge className={`text-xs ${ticketBadge(t.status)}`}>
                            {t.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {ownerships.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No units assigned yet. Contact your property manager.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
