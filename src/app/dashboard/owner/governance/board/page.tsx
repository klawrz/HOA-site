import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Users, Mail, Phone } from "lucide-react"
import { formatDateISO } from "@/lib/utils"

export default async function OwnerBoardRosterPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER" || !session.user.isBoardMember) {
    redirect("/dashboard")
  }

  const boardPositions = await db.boardPosition.findMany({
    where: { orgId: session.user.orgId ?? undefined },
    include: { user: true },
    orderBy: { title: "asc" },
  })

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/owner/governance"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Governance
        </Link>
        <h1 className="text-2xl font-bold">Board Roster</h1>
        <p className="text-gray-500 mt-1">Who holds which seat, their term, and how to reach them</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Board of Directors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {boardPositions.length === 0 && (
            <p className="text-sm text-gray-500">No Board positions on file yet.</p>
          )}
          {boardPositions.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  {p.title}
                  {p.user && <span className="text-gray-400 font-normal"> — {p.user.name ?? p.user.email}</span>}
                  {!p.user && <span className="text-gray-400 font-normal"> — Vacant</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateISO(p.termStart)}
                  {p.termEnd ? ` – ${formatDateISO(p.termEnd)}` : " – present"}
                </p>
              </div>
              {p.user && (
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {p.user.email}
                  </span>
                  {p.user.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {p.user.phone}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
