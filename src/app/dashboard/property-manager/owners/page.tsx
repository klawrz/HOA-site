import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { compareUnitNumbers } from "@/lib/unit-label-format"
import { canPreviewRole } from "@/lib/role-access"
import { OwnersList } from "./owners-list"

export default async function OwnersDirectoryPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  // Driven by UnitOwnership - the actual source of truth for "who owns a
  // unit here" - rather than Membership.role === "OWNER". A custodian who
  // claimed their own unit during onboarding stays an ACCOUNT_OWNER
  // membership, not an OWNER one, but they're a real owner all the same.
  const [owners, unitLabel] = await Promise.all([
    db.user.findMany({
      where: { ownedUnits: { some: { isCurrent: true, unit: { orgId: session.user.orgId ?? undefined } } } },
      include: {
        ownedUnits: {
          where: { isCurrent: true, unit: { orgId: session.user.orgId ?? undefined } },
          include: {
            unit: {
              include: { leases: { where: { isActive: true } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    getUnitLabel(session.user.orgId),
  ])

  const rows = owners.map((owner) => ({
    id: owner.id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    units: [...owner.ownedUnits]
      .sort((a, b) => compareUnitNumbers(a.unit, b.unit))
      .map((ou) => ({
        id: ou.id,
        name: unitDisplayName(unitLabel, ou.unit.number),
        rentalPolicy: ou.rentalPolicy,
        rented: ou.unit.leases.length > 0,
      })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Owner Directory</h1>
        <p className="text-gray-500 mt-1">
          {owners.length} owner{owners.length !== 1 ? "s" : ""} registered
        </p>
      </div>

      <OwnersList owners={rows} />
    </div>
  )
}
