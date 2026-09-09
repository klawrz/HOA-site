import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getUnitLabel, unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"
import { NewUnitDialog } from "./new-unit-dialog"
import { BulkAddUnitsDialog } from "./bulk-add-units-dialog"
import { UnitLabelForm } from "./unit-label-form"
import { AccountUnitsList } from "./units-list"

export default async function AccountUnitsPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const [units, unitLabel] = await Promise.all([
    db.unit.findMany({
      where: { orgId: session.user.orgId },
      include: {
        ownerships: { where: { isCurrent: true }, include: { owner: true } },
        managers: { include: { user: true } },
      },
    }),
    getUnitLabel(session.user.orgId),
  ])
  units.sort(compareUnitNumbers)

  const rows = units.map((u) => ({
    id: u.id,
    number: u.number,
    display: unitDisplayName(unitLabel, u.number),
    building: u.building,
    floor: u.floor,
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    sqft: u.sqft,
    description: u.description,
    civicRoll: u.civicRoll,
    status: u.status,
    owner: u.ownerships[0]?.owner
      ? { name: u.ownerships[0].owner.name, email: u.ownerships[0].owner.email }
      : null,
    managerName: u.managers[0]
      ? u.managers[0].user?.name ?? u.managers[0].user?.email ?? u.managers[0].name
      : null,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Units</h1>
          <p className="text-gray-500 text-sm">
            {units.length} {unitLabel.toLowerCase()}{units.length !== 1 ? "s" : ""} in your HOA.
          </p>
          <UnitLabelForm unitLabel={unitLabel} />
        </div>
        <div className="flex gap-2">
          <BulkAddUnitsDialog unitLabel={unitLabel} />
          <NewUnitDialog unitLabel={unitLabel} />
        </div>
      </div>

      <AccountUnitsList units={rows} unitLabel={unitLabel} />
    </div>
  )
}
