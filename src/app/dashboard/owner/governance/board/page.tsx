import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, FileText, Megaphone, ChevronRight, DollarSign } from "lucide-react"
import { NewMeetingDialog } from "@/app/dashboard/board/meetings/new-meeting-dialog"
import { MeetingMinutesDialog } from "@/app/dashboard/board/meetings/minutes-dialog"
import { NewDocumentDialog } from "@/app/dashboard/board/documents/new-document-dialog"
import { documentCategoryLabel, documentCategoryColor, documentVisibilityLabel, documentVisibilityColor } from "@/lib/document-styles"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { NewAnnouncementDialog } from "@/components/announcements/new-announcement-dialog"

export default async function OwnerBoardManagementPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER" || !session.user.isBoardMember) {
    redirect("/dashboard")
  }

  const [announcements, meetings, documents, budgetCount] = await Promise.all([
    db.announcement.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    db.meeting.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { date: "desc" } }),
    db.document.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { createdAt: "desc" } }),
    db.budget.count({ where: { orgId: session.user.orgId ?? undefined } }),
  ])

  const groupedDocs = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/owner/governance"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Governance
        </Link>
        <h1 className="text-2xl font-bold">Board Management</h1>
        <p className="text-gray-500 mt-1">
          You have Board governance access - schedule meetings, record minutes, and manage the document
          repository.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </CardTitle>
          <NewAnnouncementDialog />
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
            canManage
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Meetings
          </CardTitle>
          <NewMeetingDialog />
        </CardHeader>
        <CardContent className="space-y-2">
          {meetings.length === 0 && <p className="text-sm text-gray-500">No meetings recorded yet.</p>}
          {meetings.map((m) => (
            <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-gray-400">
                    {m.date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    {m.location && ` · ${m.location}`}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    m.minutes ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {m.minutes ? "Minutes filed" : "Minutes pending"}
                </span>
              </div>
              {m.agenda && <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{m.agenda}</p>}
              <MeetingMinutesDialog meeting={m} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Document Repository
          </CardTitle>
          <NewDocumentDialog />
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 && <p className="text-sm text-gray-500">No documents yet.</p>}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{d.title}</p>
                          {d.visibility === "BOARD_AND_PM" && (
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${documentVisibilityColor[d.visibility]}`}>
                              {documentVisibilityLabel[d.visibility]}
                            </span>
                          )}
                        </div>
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

      <Link href="/dashboard/owner/governance/board/finances">
        <Card className="hover:border-gray-300 transition-colors">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">Finances</p>
                <p className="text-xs text-gray-400">
                  {budgetCount} budget{budgetCount !== 1 ? "s" : ""} on record
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
