import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Building2, Trash2 } from "lucide-react"
import { deleteUnit } from "@/app/actions/org"
import { NewUnitDialog } from "./new-unit-dialog"

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  OWNER_OCCUPIED: "bg-blue-100 text-blue-700",
  RENTED: "bg-yellow-100 text-yellow-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
}

export default async function AccountUnitsPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const units = await db.unit.findMany({
    where: { orgId: session.user.orgId },
    include: {
      ownerships: { where: { isCurrent: true }, include: { owner: true } },
      managers: { include: { user: true } },
    },
    orderBy: { number: "asc" },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Units</h1>
          <p className="text-gray-500 text-sm">
            {units.length} unit{units.length !== 1 ? "s" : ""} in your HOA.
          </p>
        </div>
        <NewUnitDialog />
      </div>

      <div className="bg-white border rounded-xl divide-y">
        {units.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No units yet</p>
          </div>
        )}
        {units.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <p className="font-medium">Unit {u.number}</p>
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
                {u.ownerships[0]?.owner && (
                  <p className="text-gray-600">{u.ownerships[0].owner.name ?? u.ownerships[0].owner.email}</p>
                )}
                {u.managers[0]?.user && (
                  <p className="text-gray-400">
                    UM: {u.managers[0].user.name ?? u.managers[0].user.email}
                  </p>
                )}
              </div>
              <form action={deleteUnit.bind(null, u.id)}>
                <button type="submit" className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
