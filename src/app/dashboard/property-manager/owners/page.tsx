import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function OwnersDirectoryPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const owners = await db.user.findMany({
    where: { role: "OWNER" },
    include: {
      ownedUnits: {
        include: {
          unit: {
            include: { leases: { where: { isActive: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const policyColor: Record<string, string> = {
    ANYONE: "bg-green-100 text-green-800",
    FRIENDS_FAMILY_ONLY: "bg-yellow-100 text-yellow-800",
    NOT_RENTING: "bg-gray-100 text-gray-600",
  }

  const policyLabel: Record<string, string> = {
    ANYONE: "Open to anyone",
    FRIENDS_FAMILY_ONLY: "Friends & family",
    NOT_RENTING: "Not renting",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Owner Directory</h1>
        <p className="text-gray-500 mt-1">{owners.length} owners registered</p>
      </div>

      <div className="grid gap-4">
        {owners.map((owner) => (
          <Card key={owner.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{owner.name ?? "Unnamed"}</CardTitle>
                  <p className="text-sm text-gray-500">{owner.email}</p>
                  {owner.phone && <p className="text-sm text-gray-500">{owner.phone}</p>}
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {owner.ownedUnits.length} unit{owner.ownedUnits.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {owner.ownedUnits.length === 0 ? (
                <p className="text-sm text-gray-400">No units assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {owner.ownedUnits.map((ou) => {
                    const hasRenter = ou.unit.leases.length > 0
                    return (
                      <div
                        key={ou.id}
                        className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border text-sm"
                      >
                        <span className="font-semibold">Unit {ou.unit.number}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${policyColor[ou.rentalPolicy]}`}
                        >
                          {policyLabel[ou.rentalPolicy]}
                        </span>
                        {hasRenter && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            Rented
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {owners.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No owners registered yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
