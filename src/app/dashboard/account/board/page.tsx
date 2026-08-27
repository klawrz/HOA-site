import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BoardPositionCard } from "./board-position-card"
import { BoardPositionDialog } from "./board-position-dialog"
import { canPreviewRole } from "@/lib/role-access"

export default async function AccountBoardPage() {
  const session = await auth()
  if (!session?.user.orgId || !canPreviewRole(session.user.role, "ACCOUNT_OWNER")) redirect("/dashboard")

  const [positions, memberMemberships, pendingOwnerRows] = await Promise.all([
    db.boardPosition.findMany({
      where: { orgId: session.user.orgId },
      include: { user: true },
      orderBy: { title: "asc" },
    }),
    db.membership.findMany({
      where: { orgId: session.user.orgId, role: { not: "ACCOUNT_OWNER" } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    // Staged owners (see PendingOwner in schema.prisma) aren't real portal
    // members yet, but a custodian filling a board seat with one of them
    // shouldn't have to re-type a name/email HOPE already has on file.
    db.pendingOwner.findMany({
      where: { orgId: session.user.orgId },
      include: { unit: { select: { number: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ])
  const members = memberMemberships.map((m) => m.user)
  const rosterOwners = pendingOwnerRows.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    unitNumber: p.unit.number,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Board Composition</h1>
          <p className="text-gray-500 text-sm mt-1">
            {`${positions.length} seat${positions.length !== 1 ? "s" : ""} - add or remove seats to change the board's size`}
          </p>
        </div>
        <BoardPositionDialog
          members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
          rosterOwners={rosterOwners}
        />
      </div>

      <div className="space-y-3">
        {positions.map((p) => (
          <BoardPositionCard
            key={p.id}
            position={{
              id: p.id,
              title: p.title,
              userId: p.userId,
              userName: p.user?.name ?? null,
              userEmail: p.user?.email ?? null,
              termStart: p.termStart,
              termEnd: p.termEnd,
              notes: p.notes,
            }}
            members={members.map((m) => ({ id: m.id, name: m.name, email: m.email }))}
            rosterOwners={rosterOwners}
          />
        ))}
        {positions.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No board seats yet. Add one to start building the board&apos;s composition.
          </p>
        )}
      </div>
    </div>
  )
}
