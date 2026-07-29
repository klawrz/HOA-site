import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { MembersList } from "./members-list"

export default async function AccountMembersPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const members = await db.user.findMany({
    where: { orgId: session.user.orgId },
    include: { ownedUnits: { where: { isCurrent: true }, include: { unit: true } } },
  })

  const sorted = [...members].sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email)
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-gray-500 text-sm">
          {members.length} member{members.length !== 1 ? "s" : ""} in your organization.
        </p>
      </div>

      <MembersList
        members={sorted.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          units: m.ownedUnits.map((o) => o.unit.number),
        }))}
      />
    </div>
  )
}
