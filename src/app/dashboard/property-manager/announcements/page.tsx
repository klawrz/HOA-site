import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone } from "lucide-react"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { ArchivedAnnouncementsSection } from "@/components/announcements/archived-announcements-section"
import { NewAnnouncementDialog } from "@/components/announcements/new-announcement-dialog"
import { canPreviewRole } from "@/lib/role-access"
import { notExpiredAnnouncement } from "@/lib/audience"

export default async function PropertyManagerAnnouncementsPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [announcements, archived, orgMemberships] = await Promise.all([
    db.announcement.findMany({
      where: { orgId: session.user.orgId ?? undefined, archivedAt: null, ...notExpiredAnnouncement() },
      include: {
        author: true,
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { reads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.announcement.findMany({
      where: { orgId: session.user.orgId ?? undefined, archivedAt: { not: null } },
      include: {
        author: true,
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        _count: { select: { reads: true } },
      },
      orderBy: { archivedAt: "desc" },
    }),
    db.membership.findMany({ where: { orgId: session.user.orgId ?? undefined }, select: { userId: true, role: true } }),
  ])
  const roleByUserId = new Map(orgMemberships.map((m) => [m.userId, m.role]))
  const toRow = (a: (typeof announcements)[number]) => ({
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
    visibleRoles: a.visibleRoles,
    removeAfter: a.removeAfter,
    postOn: a.postOn,
    archivedAt: a.archivedAt,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="text-gray-500 mt-1">
          Notices to Owners - utility interruptions, access code changes, filter reminders, and the like.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Posted Announcements
          </CardTitle>
          <NewAnnouncementDialog />
        </CardHeader>
        <CardContent>
          <AnnouncementList announcements={announcements.map(toRow)} canManage currentUserId={session.user.id} />
          {archived.length > 0 && (
            <ArchivedAnnouncementsSection announcements={archived.map(toRow)} currentUserId={session.user.id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
