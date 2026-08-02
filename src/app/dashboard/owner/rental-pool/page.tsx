import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Users } from "lucide-react"
import { TodayOccupancy } from "@/components/occupancy/today-occupancy"
import { RentalPoolToggleList } from "./rental-pool-toggle-list"
import { getUnitLabel } from "@/lib/unit-label"

export default async function RentalPoolPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const [org, ownerships, unitLabel] = await Promise.all([
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    db.unitOwnership.findMany({
      where: { ownerId: session.user.id, isCurrent: true },
      include: { unit: true },
      orderBy: { unit: { number: "asc" } },
    }),
    getUnitLabel(session.user.orgId),
  ])

  const isMemberAnywhere = ownerships.some((o) => o.rentalPoolMember)

  // Only queried once the signed-in owner has opted at least one unit in -
  // reciprocity is the point: you see the shared pool calendar only once
  // you're also sharing into it.
  const poolUnits = isMemberAnywhere
    ? await db.unitOwnership.findMany({
        where: { isCurrent: true, rentalPoolMember: true, unit: { orgId: session.user.orgId ?? undefined } },
        include: {
          unit: {
            include: {
              occupancyEntries: { orderBy: { startDate: "asc" } },
              leases: { where: { isActive: true }, include: { renter: true }, take: 1 },
            },
          },
        },
      })
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="h-5 w-5" /> Rental Pool
        </h1>
        <p className="text-gray-500 mt-1">
          Coordinate overflow guests with other willing owners - occupancy visibility only, no bookings or money
          through HOPE.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          {org?.rentalPoolGuidelines ? (
            <p className="text-sm text-gray-600 whitespace-pre-line">{org.rentalPoolGuidelines}</p>
          ) : (
            <p className="text-sm text-gray-400">No guidelines on file yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Units</CardTitle>
          <p className="text-xs text-gray-400">
            Join or leave the pool per unit - you only see the shared calendar below once at least one of your
            units is a member.
          </p>
        </CardHeader>
        <CardContent>
          {ownerships.length === 0 ? (
            <p className="text-sm text-gray-400">No units on file yet.</p>
          ) : (
            <RentalPoolToggleList
              unitLabel={unitLabel}
              units={ownerships.map((o) => ({
                ownershipId: o.id,
                number: o.unit.number,
                building: o.unit.building,
                member: o.rentalPoolMember,
              }))}
            />
          )}
        </CardContent>
      </Card>

      {isMemberAnywhere ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Pool Occupancy
            </CardTitle>
            <p className="text-xs text-gray-400">Every unit currently in the pool, including yours.</p>
          </CardHeader>
          <CardContent>
            <TodayOccupancy
              unitLabel={unitLabel}
              units={poolUnits.map((o) => ({
                id: o.unit.id,
                number: o.unit.number,
                building: o.unit.building,
                entries: o.unit.occupancyEntries,
                activeLease: o.unit.leases[0]
                  ? { renterName: o.unit.leases[0].renter.name, startDate: o.unit.leases[0].startDate }
                  : null,
              }))}
              canManage={false}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-gray-400">
            Join the pool with at least one unit to see other pool members&apos; occupancy.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
