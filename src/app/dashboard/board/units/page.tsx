import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, ChevronRight } from "lucide-react"
import { getUnitLabel, unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"
import { TransferOwnershipDialog } from "@/components/units/transfer-ownership-dialog"
import { CancelTransferButton } from "@/components/units/cancel-transfer-button"
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Units</h1>
        <p className="text-gray-500 text-sm">
          {units.length} {unitLabel.toLowerCase()}{units.length !== 1 ? "s" : ""} in the HOA. Select
          one for full detail and status.
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
          // A unit can have more than one current owner (a married couple,
          // partners, co-owning friends - a real pattern in Dara's own
          // imported owner roster) - show all of them, not just whichever
          // happened to be first.
          const ownerNames = u.ownerships.map((o) => o.owner.name ?? o.owner.email).join(" & ")
          const earliestSince = u.ownerships.reduce<Date | null>(
            (min, o) => (min === null || o.since < min ? o.since : min),
            null
          )
          const pending = pendingByUnit.get(u.id)
          return (
            <div key={u.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/dashboard/board/units/${u.id}`}
                  className="flex flex-1 items-center justify-between gap-4 min-w-0 group"
                >
                  <div className="min-w-0">
                    <p className="font-medium group-hover:underline">{display}</p>
                    <p className="text-xs text-gray-400">
                      {[u.building, u.bedrooms && `${u.bedrooms}bd`, u.bathrooms && `${u.bathrooms}ba`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {u.status !== "OWNER_OCCUPIED" && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[u.status]}`}>
                        {u.status.replace(/_/g, " ")}
                      </span>
                    )}
                    <div className="text-right text-xs">
                      {ownerNames && <p className="text-gray-600">{ownerNames}</p>}
                      {earliestSince && (
                        <p className="text-gray-400">
                          Since {new Date(earliestSince).toLocaleDateString()}
                        </p>
                      )}
                      {u.managers[0] && (
                        <p className="text-gray-400">
                          UM: {u.managers[0].user?.name ?? u.managers[0].user?.email ?? u.managers[0].name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
                  </div>
                </Link>
                {!pending && (
                  <TransferOwnershipDialog
                    unitId={u.id}
                    unitDisplay={display}
                    currentOwnerName={ownerNames || null}
                  />
                )}
              </div>
              {pending && (
                <div className="mt-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                  <div className="text-amber-800">
                    <p className="font-medium">
                      Transfer to {pending.newOwnerName} pending confirmation
                    </p>
                    <p className="text-amber-700">
                      Sellers:{" "}
                      {pending.sellerConfirmations
                        .map((c) => `${c.owner.name ?? c.owner.email}${c.confirmedAt ? " ✓" : " (waiting)"}`)
                        .join(", ") || "none required"}
                      {" · "}
                      Buyer: {pending.invite?.acceptedAt ? "✓ confirmed" : "waiting"}
                    </p>
                  </div>
                  <CancelTransferButton requestId={pending.id} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
