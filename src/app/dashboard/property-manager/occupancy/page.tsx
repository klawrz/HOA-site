import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { OccupancyList } from "@/components/occupancy/occupancy-list"
import { getUnitLabel, compareUnitNumbers } from "@/lib/unit-label"
import { canPreviewRole } from "@/lib/role-access"

export default async function PropertyManagerOccupancyPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  // Only load the last year of history plus everything current/upcoming.
  const historyFrom = new Date()
  historyFrom.setFullYear(historyFrom.getFullYear() - 1)

  const [units, unitLabel] = await Promise.all([
    db.unit.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: {
        ownerships: { where: { isCurrent: true }, take: 1 },
        occupancyEntries: { where: { endDate: { gte: historyFrom } }, orderBy: { startDate: "asc" } },
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
      <OccupancyList
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
      />
    </div>
  )
}
