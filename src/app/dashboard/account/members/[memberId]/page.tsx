import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, MessageCircle } from "lucide-react"
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

  const [membership, unitLabel] = await Promise.all([
    db.membership.findFirst({
      where: { userId: memberId, orgId: session.user.orgId },
      include: {
        user: {
          include: {
            ownedUnits: { where: { isCurrent: true }, include: { unit: true } },
            leases: { include: { unit: true } },
          },
        },
      },
    }),
    getUnitLabel(session.user.orgId),
  ])

  if (!membership) notFound()
  const member = { ...membership.user, role: membership.role, isBoardMember: membership.isBoardMember }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href="/dashboard/account/members"
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Members
      </Link>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColors[member.role] ?? "bg-gray-100 text-gray-600"}`}
        >
          {roleLabels[member.role] ?? member.role}
        </span>
        <Button variant="outline" size="sm" disabled className="gap-2 text-gray-400">
          <MessageCircle className="h-4 w-4" /> Contact (coming soon)
        </Button>
      </div>

      <MemberEditCard
        memberId={member.id}
        name={member.name}
        email={member.email}
        phone={member.phone}
      />

      {member.role !== "ACCOUNT_OWNER" && member.role !== "BOARD_MEMBER" && (
        <BoardMemberToggle memberId={member.id} initialValue={member.isBoardMember} />
      )}

      {member.ownedUnits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" /> Owned Units
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {member.ownedUnits.map((o) => (
              <p key={o.id} className="text-sm text-gray-600">
                {unitDisplayName(unitLabel, o.unit.number, o.unit.building)}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {member.leases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-400" /> Leases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {member.leases.map((l) => (
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
