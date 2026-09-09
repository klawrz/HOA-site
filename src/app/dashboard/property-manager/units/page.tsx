import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getUnitLabel, compareUnitNumbers } from "@/lib/unit-label"
import { canPreviewRole } from "@/lib/role-access"
import { UnitAvailabilityList } from "./unit-availability-list"

export default async function UnitAvailabilityPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [units, unitLabel] = await Promise.all([
    db.unit.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: {
        ownerships: { where: { isCurrent: true }, include: { owner: true } },
        leases: { where: { isActive: true }, include: { renter: true } },
      },
    }),
    getUnitLabel(session.user.orgId),
  ])
  units.sort(compareUnitNumbers)

  const rows = units.map((u) => {
    const ownership = u.ownerships[0]
    const lease = u.leases[0]
    return {
      id: u.id,
      number: u.number,
      building: u.building,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      sqft: u.sqft,
      status: u.status,
      rentalPolicy: ownership?.rentalPolicy ?? "NOT_RENTING",
      ownerName: ownership?.owner.name ?? null,
      ownerEmail: ownership?.owner.email ?? null,
      ownerPhone: ownership?.owner.phone ?? null,
      renterName: lease?.renter.name ?? null,
      renterEmail: lease?.renter.email ?? null,
      renterEndDate: lease?.endDate ? lease.endDate.toISOString() : null,
      notes: ownership?.notes ?? null,
    }
  })

  const legend = [
    { dot: "bg-green-500", label: "Open to anyone" },
    { dot: "bg-yellow-500", label: "Friends & family only" },
    { dot: "bg-orange-500", label: "Short-term rental" },
    { dot: "bg-gray-400", label: "Not renting" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Unit Availability Board</h1>
        <p className="text-gray-500 mt-1">
          Rental availability and policy for all {units.length} {unitLabel.toLowerCase()}s
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {legend.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
            <span className="text-gray-600">{l.label}</span>
          </div>
        ))}
      </div>

      <UnitAvailabilityList units={rows} unitLabel={unitLabel} />
    </div>
  )
}
