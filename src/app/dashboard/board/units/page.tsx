import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getUnitLabel, unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"
import { canPreviewRole } from "@/lib/role-access"
import { BoardUnitsList } from "./units-list"

// Board Members get full read access to every unit and its current owner -
// per Dara: "board members need to have instant access to the units list
// and all unit details". The list itself is search / filter / paginated in
// units-list.tsx so it holds up at 100+ units; each row links to the
// per-unit detail page.
export default async function BoardUnitsPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")
  if (!canPreviewRole(session.user.role, "BOARD_MEMBER") && !session.user.isBoardMember) redirect("/dashboard")

  const [units, unitLabel, pendingTransfers] = await Promise.all([
    db.unit.findMany({
      where: { orgId: session.user.orgId },
      include: {
        ownerships: { where: { isCurrent: true }, include: { owner: true } },
        managers: { include: { user: true } },
      },
    }),
    getUnitLabel(session.user.orgId),
    db.ownershipTransferRequest.findMany({
      where: { orgId: session.user.orgId, status: "PENDING" },
      include: { sellerConfirmations: { include: { owner: true } }, invite: true },
    }),
  ])
  units.sort(compareUnitNumbers)
  const pendingByUnit = new Map(pendingTransfers.map((t) => [t.unitId, t]))

  // Flatten to plain rows for the client list component (search / filter /
  // pagination all run in the browser over this array).
  const rows = units.map((u) => {
    // A unit can have more than one current owner (a couple, partners,
    // co-owning friends) - show all of them.
    const ownerNames = u.ownerships.map((o) => o.owner.name ?? o.owner.email).join(" & ")
    const earliestSince = u.ownerships.reduce<Date | null>(
      (min, o) => (min === null || o.since < min ? o.since : min),
      null
    )
    const pending = pendingByUnit.get(u.id)
    return {
      id: u.id,
      number: u.number,
      display: unitDisplayName(unitLabel, u.number),
      building: u.building,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      status: u.status,
      ownerNames,
      earliestSince: earliestSince ? earliestSince.toISOString() : null,
      managerName: u.managers[0]
        ? u.managers[0].user?.name ?? u.managers[0].user?.email ?? u.managers[0].name
        : null,
      pending: pending
        ? {
            id: pending.id,
            newOwnerName: pending.newOwnerName,
            sellerSummary:
              pending.sellerConfirmations
                .map((c) => `${c.owner.name ?? c.owner.email}${c.confirmedAt ? " ✓" : " (waiting)"}`)
                .join(", ") || "none required",
            buyerConfirmed: !!pending.invite?.acceptedAt,
          }
        : null,
    }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Units</h1>
        <p className="text-gray-500 text-sm">
          {units.length} {unitLabel.toLowerCase()}{units.length !== 1 ? "s" : ""} in the HOA. Select
          one for full detail and status.
        </p>
      </div>

      <BoardUnitsList units={rows} unitLabel={unitLabel} />
    </div>
  )
}
