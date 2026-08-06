import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { TodayOccupancy } from "@/components/occupancy/today-occupancy"
import { getUnitLabel, compareUnitNumbers } from "@/lib/unit-label"

export default async function PropertyManagerOccupancyPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const [units, unitLabel] = await Promise.all([
    db.unit.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: {
        ownerships: { where: { isCurrent: true }, take: 1 },
        occupancyEntries: { orderBy: { startDate: "asc" } },
        leases: { where: { isActive: true }, include: { renter: true }, take: 1 },
      },
    }),
    getUnitLabel(session.user.orgId),
  ])
  units.sort(compareUnitNumbers)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Occupancy</h1>
        <p className="text-gray-500 mt-1">
          Every unit is listed - only ones whose owner has chosen to share occupancy with the Property Manager
          show any detail. A blank line means either nothing logged or the owner keeping it private - there&apos;s
          no way to tell the difference, by design.
        </p>
      </div>
      <TodayOccupancy
        unitLabel={unitLabel}
        units={units.map((u) => {
          const visible = u.ownerships[0]?.occupancyVisibleToPM ?? false
          const lease = u.leases[0]
          return {
            id: u.id,
            number: u.number,
            building: u.building,
            entries: visible ? u.occupancyEntries : [],
            activeLease: visible && lease ? { renterName: lease.renter.name, startDate: lease.startDate } : null,
          }
        })}
        canManage={false}
      />
    </div>
  )
}
