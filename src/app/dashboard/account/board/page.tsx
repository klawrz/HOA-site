import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { BoardPositionCard } from "./board-position-card"
import { BoardPositionDialog } from "./board-position-dialog"

export default async function AccountBoardPage() {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") redirect("/dashboard")

  const [positions, members] = await Promise.all([
    db.boardPosition.findMany({
      where: { orgId: session.user.orgId },
      include: { user: true },
      orderBy: { title: "asc" },
    }),
    db.user.findMany({
      where: { orgId: session.user.orgId, role: { not: "ACCOUNT_OWNER" } },
      orderBy: { name: "asc" },
    }),
  ])

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
