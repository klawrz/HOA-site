import type { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ClipboardList, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn, formatDate } from "@/lib/utils"
import { documentCategoryColor } from "@/lib/document-styles"
import { getAttentionItems, attentionSeverityLabel } from "@/lib/attention"
import { greeting } from "@/lib/greeting"
import { BoardRosterPrompt } from "@/components/dashboard/board-roster-prompt"
import { canPreviewRole } from "@/lib/role-access"

const attentionSeverityColor: Record<string, string> = {
  expired: "bg-red-100 text-red-800",
  overdue: "bg-red-100 text-red-800",
  over_budget: "bg-amber-100 text-amber-800",
  expiring: "bg-amber-100 text-amber-800",
}

export default async function BoardDashboard() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  const now = new Date()
  const orgId = session.user.orgId ?? undefined

  // The priority-tile row (Finances / PM / Units / Employees / AGM) now
  // lives in the Board layout so it sits on every Board page - this home
  // page keeps just the "As a Board Member..." card (greeting + what needs
  // attention right now) and the recent meetings/documents.
  const [agm, minutesPending, attentionItems, recentMeetings, recentDocs, ownBoardPosition] = await Promise.all([
    session.user.orgId
      ? db.keyDate.findUnique({ where: { orgId_type: { orgId: session.user.orgId, type: "AGM" } } })
      : Promise.resolve(null),
    db.meeting.count({ where: { orgId, date: { lte: now }, minutes: null } }),
    session.user.orgId ? getAttentionItems(session.user.orgId, "/dashboard/board") : Promise.resolve([]),
    db.meeting.findMany({ where: { orgId }, orderBy: { date: "desc" }, take: 4 }),
    db.document.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.boardPosition.findFirst({ where: { orgId, userId: session.user.id }, select: { id: true } }),
  ])

  const agmDays = agm ? Math.ceil((agm.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

  // "As a Board Member..." priorities - meetings still missing minutes, an
  // AGM coming up soon, plus everything getAttentionItems already flags
  // (expiring contracts/compliance, overdue assessments, budget overage).
  const boardPriorities: { icon: ReactNode; text: string; href: string }[] = []
  if (minutesPending > 0) {
    boardPriorities.push({
      icon: <ClipboardList className="h-4 w-4 text-amber-600" />,
      text: `${minutesPending} past meeting${minutesPending !== 1 ? "s" : ""} still ${minutesPending !== 1 ? "need" : "needs"} minutes filed.`,
      href: "/dashboard/board/meetings",
    })
  }
  if (agm && agmDays !== null && agmDays >= 0 && agmDays <= 30) {
    boardPriorities.push({
      icon: <CalendarDays className="h-4 w-4 text-purple-600" />,
      text: `AGM on ${formatDate(agm.date)} — ${agmDays === 0 ? "today" : `${agmDays} day${agmDays !== 1 ? "s" : ""} away`}.`,
      href: "/dashboard/board/key-info/agm",
    })
  }

  const nothingPressing = boardPriorities.length === 0 && attentionItems.length === 0

  return (
    <div className="space-y-6">
      {!ownBoardPosition && <BoardRosterPrompt href="/dashboard/board/board" />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">As a Board Member...</CardTitle>
          <p className="text-xs text-gray-400">{greeting()}.</p>
        </CardHeader>
        <CardContent className="pt-0">
          {nothingPressing ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Everything&apos;s quiet — minutes are up to
              date, nothing expiring or overdue.
            </p>
          ) : (
            <div className="space-y-2">
              {boardPriorities.map((p, i) => (
                <Link key={i} href={p.href} className="flex items-start gap-2.5 text-sm text-gray-700 hover:underline">
                  <span className="mt-0.5 shrink-0">{p.icon}</span>
                  <span>{p.text}</span>
                </Link>
              ))}
              {attentionItems.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.detail}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${attentionSeverityColor[item.severity]}`}
                  >
                    {attentionSeverityLabel[item.severity]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Meetings</CardTitle>
            <Link href="/dashboard/board/meetings" className={cn(buttonVariants({ size: "sm" }))}>View All</Link>
          </CardHeader>
          <CardContent>
            {recentMeetings.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No meetings recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(m.date)}
                        {m.location && ` · ${m.location}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        m.minutes
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {m.minutes ? "Minutes filed" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Documents</CardTitle>
            <Link href="/dashboard/board/documents" className={cn(buttonVariants({ size: "sm" }))}>View All</Link>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No documents yet.</p>
            ) : (
              <div className="space-y-2">
                {recentDocs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(d.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${documentCategoryColor[d.category]}`}
                    >
                      {d.category.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
