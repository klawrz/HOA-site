import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone } from "lucide-react"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { NewAnnouncementDialog } from "@/components/announcements/new-announcement-dialog"

export default async function BoardAnnouncementsPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const [announcements, orgMemberships] = await Promise.all([
    db.announcement.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: {
        author: true,
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { reads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.membership.findMany({ where: { orgId: session.user.orgId ?? undefined }, select: { userId: true, role: true } }),
  ])
  const roleByUserId = new Map(orgMemberships.map((m) => [m.userId, m.role]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-gray-500 mt-1">News to Owners - meeting updates, dues reminders, status updates</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Posted Announcements
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
              author: { name: a.author.name, email: a.author.email, role: roleByUserId.get(a.authorId) ?? "OWNER" },
              comments: a.comments.map((c) => ({
                id: c.id,
                content: c.content,
                createdAt: c.createdAt,
                authorId: c.authorId,
                author: { name: c.author.name, email: c.author.email, role: roleByUserId.get(c.authorId) ?? "OWNER" },
              })),
              readCount: a._count.reads,
            }))}
            canManage
            currentUserId={session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
