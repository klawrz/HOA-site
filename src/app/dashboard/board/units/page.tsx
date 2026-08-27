import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"
import { getUnitLabel, unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"
import { TransferOwnershipDialog } from "@/components/units/transfer-ownership-dialog"
import { canPreviewRole } from "@/lib/role-access"

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  OWNER_OCCUPIED: "bg-blue-100 text-blue-700",
  RENTED: "bg-yellow-100 text-yellow-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
}

// Board Members get full read access to every unit and its current owner -
// per Dara: "board members need to have instant access to the units list
// and all unit details" - the one carve-out (occupancy visibility, opt-out
// by unit owner) doesn't apply here since this page doesn't show occupancy
// at all, same as the Account Owner's own Units page it mirrors.
export default async function BoardUnitsPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")
  if (!canPreviewRole(session.user.role, "BOARD_MEMBER") && !session.user.isBoardMember) redirect("/dashboard")

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Units</h1>
        <p className="text-gray-500 text-sm">
          {units.length} {unitLabel.toLowerCase()}{units.length !== 1 ? "s" : ""} in the HOA.
        </p>
      </div>

      <div className="bg-white border rounded-xl divide-y">
        {units.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No {unitLabel.toLowerCase()}s yet</p>
          </div>
        )}
        {units.map((u) => {
          const display = unitDisplayName(unitLabel, u.number)
          const owner = u.ownerships[0]?.owner
          return (
            <div key={u.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium">{display}</p>
                  <p className="text-xs text-gray-400">
                    {[u.building, u.bedrooms && `${u.bedrooms}bd`, u.bathrooms && `${u.bathrooms}ba`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[u.status]}`}>
                  {u.status.replace(/_/g, " ")}
                </span>
                <div className="text-right text-xs">
                  {owner && <p className="text-gray-600">{owner.name ?? owner.email}</p>}
                  {u.ownerships[0]?.since && (
                    <p className="text-gray-400">
                      Since {new Date(u.ownerships[0].since).toLocaleDateString()}
                    </p>
                  )}
                  {u.managers[0] && (
                    <p className="text-gray-400">
                      UM: {u.managers[0].user?.name ?? u.managers[0].user?.email ?? u.managers[0].name}
                    </p>
                  )}
                </div>
                <TransferOwnershipDialog
                  unitId={u.id}
                  unitDisplay={display}
                  currentOwnerName={owner ? (owner.name ?? owner.email) : null}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
