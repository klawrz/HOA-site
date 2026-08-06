import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, Landmark, MessageCircle, Mail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MemberEditCard } from "./member-edit-card"
import { BoardMemberToggle } from "./board-member-toggle"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"

const roleLabels: Record<string, string> = {
  ACCOUNT_OWNER: "Account Owner",
  OWNER: "Unit Owner",
  RENTER: "Renter",
  PROPERTY_MANAGER: "Property Manager",
  CONTRACTOR: "Contractor",
  BOARD_MEMBER: "Board Member",
  UNIT_MANAGER: "Unit Manager",
}

const roleColors: Record<string, string> = {
  ACCOUNT_OWNER: "bg-gray-900 text-white",
  OWNER: "bg-blue-100 text-blue-700",
  RENTER: "bg-green-100 text-green-700",
  PROPERTY_MANAGER: "bg-purple-100 text-purple-700",
  CONTRACTOR: "bg-orange-100 text-orange-700",
  BOARD_MEMBER: "bg-red-100 text-red-700",
  UNIT_MANAGER: "bg-teal-100 text-teal-700",
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const [user, unitLabel] = await Promise.all([
    db.user.findUnique({
      where: { id: memberId },
      include: {
        memberships: { where: { orgId: session.user.orgId } },
        ownedUnits: {
          where: { isCurrent: true, unit: { orgId: session.user.orgId } },
          include: { unit: true },
        },
        leases: { where: { unit: { orgId: session.user.orgId } }, include: { unit: true } },
        boardPositions: { where: { orgId: session.user.orgId } },
      },
    }),
    getUnitLabel(session.user.orgId),
  ])

  // A person only belongs on this page if they have some real tie to this
  // org - a Membership, a current unit ownership, or a Board seat. User is
  // a global model shared across orgs, so this is the scoping check that
  // keeps someone else's org data from leaking through here.
  const membership = user?.memberships[0] ?? null
  const hasAssociation = !!(membership || (user && (user.ownedUnits.length > 0 || user.boardPositions.length > 0)))
  if (!user || !hasAssociation) notFound()

  const role = membership?.role ?? null
  const fallbackLabel = user.boardPositions.length > 0 ? "Board Member" : "Unit Owner"

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href="/dashboard/account/members"
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Members
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${role ? roleColors[role] ?? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-600"}`}
          >
            {role ? roleLabels[role] ?? role : fallbackLabel}
          </span>
          {!membership && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              Not on portal
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" disabled className="gap-2 text-gray-400">
          <MessageCircle className="h-4 w-4" /> Contact (coming soon)
        </Button>
      </div>

      {!membership && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex items-start gap-2">
          <Mail className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            {user.name ?? user.email} is on file here but hasn&apos;t been invited to HOPE yet. Send an
            invite to <span className="font-medium">{user.email}</span> from the{" "}
            <Link href="/dashboard/account" className="underline">
              Send Invites
            </Link>{" "}
            panel to give them portal access.
          </p>
        </div>
      )}

      <MemberEditCard memberId={user.id} name={user.name} email={user.email} phone={user.phone} />

      {membership && role !== "ACCOUNT_OWNER" && role !== "BOARD_MEMBER" && (
        <BoardMemberToggle memberId={user.id} initialValue={membership.isBoardMember} />
      )}

      {user.boardPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gray-400" /> Board Positions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {user.boardPositions.map((p) => (
              <p key={p.id} className="text-sm text-gray-600">
                {p.title}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {user.ownedUnits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" /> Owned Units
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {user.ownedUnits.map((o) => (
              <p key={o.id} className="text-sm text-gray-600">
                {unitDisplayName(unitLabel, o.unit.number, o.unit.building)}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {user.leases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" /> Leases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {user.leases.map((l) => (
              <p key={l.id} className="text-sm text-gray-600">
                {unitDisplayName(unitLabel, l.unit.number)}
                {l.isActive ? " (active)" : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
