import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, FileText, Mail, Phone, Megaphone, DollarSign, PiggyBank } from "lucide-react"
import { documentCategoryLabel, documentCategoryColor } from "@/lib/document-styles"
import { formatDateISO } from "@/lib/utils"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { BudgetEditor } from "@/components/budgets/budget-editor"
import { ReserveFundSummary } from "@/components/reserve-fund/reserve-fund-summary"

export default async function OwnerGovernancePage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const now = new Date()

  const [announcements, boardPositions, meetings, documents, latestApprovedBudget, org, reserveTransactions] = await Promise.all([
    db.announcement.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    db.boardPosition.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { user: true },
      orderBy: { title: "asc" },
    }),
    db.meeting.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      orderBy: { date: "desc" },
    }),
    db.document.findMany({
      where: { orgId: session.user.orgId ?? undefined, visibility: "OWNERS" },
      orderBy: { createdAt: "desc" },
    }),
    db.budget.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "APPROVED", type: "OPERATING" },
      include: { lineItems: { include: { contract: true }, orderBy: { sortOrder: "asc" } }, meeting: true },
      orderBy: { year: "desc" },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    db.reserveTransaction.findMany({ where: { orgId: session.user.orgId ?? undefined } }),
  ])

  const reserveBalance = reserveTransactions.reduce(
    (s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount),
    0
  )

  const upcomingMeetings = meetings.filter((m) => m.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime())
  const pastMeetings = meetings.filter((m) => m.date < now)

  const groupedDocs = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Governance</h1>
        <p className="text-gray-500 mt-1">
          News, your Board, upcoming meetings, and the document repository
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementList
            announcements={announcements.map((a) => ({
              id: a.id,
              title: a.title,
              content: a.content,
              createdAt: a.createdAt,
              author: { name: a.author.name, email: a.author.email, role: a.author.role },
            }))}
            canManage={false}
          />
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Upcoming Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingMeetings.length === 0 && (
            <p className="text-sm text-gray-500">No upcoming meetings scheduled.</p>
          )}
          {upcomingMeetings.map((m) => (
            <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="text-xs text-gray-400">
                {m.date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                {m.location && ` · ${m.location}`}
              </p>
              {m.agenda && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{m.agenda}</p>}
            </div>
          ))}
          {pastMeetings.length > 0 && (
            <details className="pt-2">
              <summary className="text-xs text-gray-400 cursor-pointer">
                {pastMeetings.length} past meeting{pastMeetings.length !== 1 ? "s" : ""}
              </summary>
              <div className="space-y-2 mt-2">
                {pastMeetings.map((m) => (
                  <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{m.title}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          m.minutes ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {m.minutes ? "Minutes filed" : "Minutes pending"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{m.date.toLocaleDateString()}</p>
                    {m.minutes && (
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-line line-clamp-3">{m.minutes}</p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Approved Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestApprovedBudget ? (
            <BudgetEditor
              budget={{
                id: latestApprovedBudget.id,
                year: latestApprovedBudget.year,
                version: latestApprovedBudget.version,
                status: latestApprovedBudget.status,
                notes: latestApprovedBudget.notes,
                approvedAt: latestApprovedBudget.approvedAt,
                meetingTitle: latestApprovedBudget.meeting?.title ?? null,
                lineItems: latestApprovedBudget.lineItems.map((i) => ({
                  id: i.id,
                  label: i.label,
                  budgetedAmount: i.budgetedAmount,
                  actualAmount: i.actualAmount,
                  previousYearActual: i.previousYearActual,
                  contractId: i.contractId,
                  contractTitle: i.contract?.title ?? null,
                })),
              }}
              contracts={[]}
              meetings={[]}
              canManage={false}
              canApprove={false}
            />
          ) : (
            <p className="text-sm text-gray-500">No approved budget yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4" /> Reserve Fund
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReserveFundSummary balance={reserveBalance} target={org?.reserveTarget ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Document Repository
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 && <p className="text-sm text-gray-500">No documents on file yet.</p>}
          {Object.entries(groupedDocs).map(([category, docs]) => {
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${documentCategoryColor[category]}`}>
                    {documentCategoryLabel[category]}
                  </span>
                  <span className="text-xs text-gray-400">{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{d.title}</p>
                        {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">{d.createdAt.toLocaleDateString()}</p>
                      </div>
                      {d.fileUrl && (
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline shrink-0"
                        >
                          View file
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
