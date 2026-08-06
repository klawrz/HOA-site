import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MembersList } from "./members-list"
import { getUnitLabel } from "@/lib/unit-label"
import { getOrgPeople } from "@/lib/org-people"

export default async function AccountMembersPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const [people, unitLabel] = await Promise.all([
    getOrgPeople(session.user.orgId),
    getUnitLabel(session.user.orgId),
  ])

  const sorted = [...people].sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="text-gray-500 text-sm">
          {people.length} member{people.length !== 1 ? "s" : ""} in your organization.
        </p>
      </div>

      <MembersList
        unitLabel={unitLabel}
        members={sorted.map((p) => ({
          id: p.userId,
          name: p.name,
          email: p.email,
          role: p.membershipRole,
          units: p.unitNumbers,
          boardTitles: p.boardTitles,
          hasPortalAccess: p.hasPortalAccess,
        }))}
      />
    </div>
  )
}
