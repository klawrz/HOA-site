import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Megaphone } from "lucide-react"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { NewAnnouncementDialog } from "@/components/announcements/new-announcement-dialog"

export default async function PropertyManagerAnnouncementsPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const announcements = await db.announcement.findMany({
    where: { orgId: session.user.orgId ?? undefined },
    include: { author: true },
    orderBy: { createdAt: "desc" },
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
    </div>
  )
}
