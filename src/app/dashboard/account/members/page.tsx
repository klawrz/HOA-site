import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"

const roleLabels: Record<string, string> = {
  ACCOUNT_OWNER: "Account Owner",
  OWNER: "Unit Owner",
  RENTER: "Renter",
  PROPERTY_MANAGER: "Property Manager",
  CONTRACTOR: "Contractor",
  BOARD_MEMBER: "Board Member",
}

const roleColors: Record<string, string> = {
  ACCOUNT_OWNER: "bg-gray-900 text-white",
  OWNER: "bg-blue-100 text-blue-700",
  RENTER: "bg-green-100 text-green-700",
  PROPERTY_MANAGER: "bg-purple-100 text-purple-700",
  CONTRACTOR: "bg-orange-100 text-orange-700",
  BOARD_MEMBER: "bg-red-100 text-red-700",
}

export default async function AccountMembersPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const members = await db.user.findMany({
    where: { orgId: session.user.orgId },
    include: { ownedUnits: { include: { unit: true } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-gray-500 text-sm">{members.length} member{members.length !== 1 ? "s" : ""} in your organization.</p>
      </div>

      <div className="bg-white border rounded-xl divide-y">
        {members.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No members yet</p>
          </div>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-medium">{m.name ?? m.email}</p>
              <p className="text-xs text-gray-400">{m.email}</p>
              {m.ownedUnits.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Unit {m.ownedUnits.map((o) => o.unit.number).join(", ")}
                </p>
              )}
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColors[m.role] ?? "bg-gray-100 text-gray-600"}`}>
              {roleLabels[m.role] ?? m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
