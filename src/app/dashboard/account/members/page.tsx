import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { MembersList } from "./members-list"
import { getUnitLabel } from "@/lib/unit-label"

export default async function AccountMembersPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const [memberships, unitLabel] = await Promise.all([
    db.membership.findMany({
      where: { orgId: session.user.orgId },
      include: { user: { include: { ownedUnits: { where: { isCurrent: true }, include: { unit: true } } } } },
    }),
    getUnitLabel(session.user.orgId),
  ])

  const sorted = [...memberships].sort((a, b) =>
    (a.user.name ?? a.user.email).localeCompare(b.user.name ?? b.user.email)
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-gray-500 text-sm">
          {memberships.length} member{memberships.length !== 1 ? "s" : ""} in your organization.
        </p>
      </div>

      <MembersList
        unitLabel={unitLabel}
        members={sorted.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          units: m.user.ownedUnits.map((o) => o.unit.number),
        }))}
      />
    </div>
  )
}
