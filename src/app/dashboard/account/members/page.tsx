import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { MembersList } from "./members-list"
import { OwnerRosterPanel } from "./owner-roster-panel"
import { getUnitLabel } from "@/lib/unit-label"
import { getOrgPeople } from "@/lib/org-people"
import { compareUnitNumbers } from "@/lib/unit-label-format"

export default async function AccountMembersPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")
  const orgId = session.user.orgId

  const [people, unitLabel] = await Promise.all([
    getOrgPeople(orgId),
    getUnitLabel(orgId),
  ])

  const sorted = [...people].sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""))

  // The document-import + staged-roster owner tooling is Account-Owner-only
  // (see requireAccountOwner in pending-owners.ts) - everyone else just sees
  // the read-only member list above.
  let rosterData: {
    units: { id: string; number: string }[]
    pendingOwners: { id: string; unitId: string; unitNumber: string; name: string | null; email: string | null }[]
    ownerInvites: { id: string; email: string; token: string; acceptedAt: Date | null }[]
  } | null = null

  if (session.user.role === "ACCOUNT_OWNER") {
    const [units, pendingOwnerRows, ownerInvites] = await Promise.all([
      db.unit.findMany({ where: { orgId }, select: { id: true, number: true } }),
      db.pendingOwner.findMany({ where: { orgId }, include: { unit: { select: { number: true } } }, orderBy: { createdAt: "asc" } }),
      db.invite.findMany({ where: { orgId, role: "OWNER" }, orderBy: { createdAt: "desc" } }),
    ])
    units.sort(compareUnitNumbers)
    rosterData = {
      units,
      pendingOwners: pendingOwnerRows.map((p) => ({
        id: p.id,
        unitId: p.unitId,
        unitNumber: p.unit.number,
        name: p.name,
        email: p.email,
      })),
      ownerInvites: ownerInvites.map((i) => ({ id: i.id, email: i.email, token: i.token, acceptedAt: i.acceptedAt })),
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
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

      {rosterData && (
        <OwnerRosterPanel
          units={rosterData.units}
          unitLabel={unitLabel}
          pendingOwners={rosterData.pendingOwners}
          ownerInvites={rosterData.ownerInvites}
          baseUrl={process.env.NEXTAUTH_URL ?? "http://localhost:3000"}
        />
      )}
    </div>
  )
}
