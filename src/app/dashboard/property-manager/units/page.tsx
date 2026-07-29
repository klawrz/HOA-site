import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { RentalPolicy, UnitStatus } from "@/generated/prisma"

const policyConfig: Record<
  RentalPolicy,
  { label: string; color: string; dot: string }
> = {
  ANYONE: {
    label: "Open to Anyone",
    color: "bg-green-100 text-green-800",
    dot: "bg-green-500",
  },
  FRIENDS_FAMILY_ONLY: {
    label: "Friends & Family",
    color: "bg-yellow-100 text-yellow-800",
    dot: "bg-yellow-500",
  },
  SHORT_TERM_RENTAL: {
    label: "Short-Term Rental",
    color: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500",
  },
  NOT_RENTING: {
    label: "Not Renting",
    color: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  },
}

const statusConfig: Record<UnitStatus, { label: string; color: string }> = {
  AVAILABLE: { label: "Available", color: "bg-emerald-100 text-emerald-800" },
  RENTED: { label: "Rented", color: "bg-blue-100 text-blue-800" },
  OWNER_OCCUPIED: { label: "Owner Occupied", color: "bg-indigo-100 text-indigo-800" },
  UNAVAILABLE: { label: "Unavailable", color: "bg-gray-100 text-gray-600" },
}

export default async function UnitAvailabilityPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const units = await db.unit.findMany({
    include: {
      ownerships: { where: { isCurrent: true }, include: { owner: true } },
      leases: { where: { isActive: true }, include: { renter: true } },
    },
    orderBy: { number: "asc" },
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
          Rental availability and policy for all {units.length} units
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

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Unit</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Rental Policy</th>
              <th className="px-4 py-3 text-left">Current Renter</th>
              <th className="px-4 py-3 text-left">Unit Status</th>
              <th className="px-4 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {units.map((unit) => {
              const ownership = unit.ownerships[0]
              const policy = ownership?.rentalPolicy ?? "NOT_RENTING"
              const activeLease = unit.leases[0]
              const pc = policyConfig[policy]
              const sc = statusConfig[unit.status]

              return (
                <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold">
                    {unit.number}
                    {unit.building && (
                      <span className="font-normal text-gray-400 ml-1">
                        Bldg {unit.building}
                      </span>
                    )}
                    <div className="text-xs text-gray-400 font-normal">
                      {[
                        unit.bedrooms && `${unit.bedrooms}bd`,
                        unit.bathrooms && `${unit.bathrooms}ba`,
                        unit.sqft && `${unit.sqft.toLocaleString()}sqft`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {ownership ? (
                      <div>
                        <p className="font-medium">{ownership.owner.name}</p>
                        <p className="text-xs text-gray-400">{ownership.owner.email}</p>
                        {ownership.owner.phone && (
                          <p className="text-xs text-gray-400">{ownership.owner.phone}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${pc.dot}`} />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pc.color}`}>
                        {pc.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {activeLease ? (
                      <div>
                        <p className="font-medium">{activeLease.renter.name}</p>
                        <p className="text-xs text-gray-400">{activeLease.renter.email}</p>
                        {activeLease.endDate && (
                          <p className="text-xs text-gray-400">
                            Until {new Date(activeLease.endDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                    {ownership?.notes ?? "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
