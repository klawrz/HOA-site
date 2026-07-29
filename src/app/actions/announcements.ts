"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Both the Board (formal notices, dues reminders, meeting news) and the
// Property Manager (utility interruptions, access code changes, filter
// reminders) issue news to Owners - unlike Meetings/Documents, which are
// Board-only record-keeping.
function canPostAnnouncement(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

function revalidateAnnouncementPaths() {
  revalidatePath("/dashboard/owner")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  revalidatePath("/dashboard/property-manager/announcements")
  revalidatePath("/dashboard/board/announcements")
}

export async function createAnnouncement(data: { title: string; content: string }) {
  const session = await auth()
  if (!session || !session.user.orgId) return { success: false }
  if (!canPostAnnouncement(session.user.role, session.user.isBoardMember)) return { success: false }

  const title = data.title.trim()
  const content = data.content.trim()
  if (!title || !content) return { success: false, error: "Title and content required" }

  await db.announcement.create({
    data: {
      orgId: session.user.orgId,
      title,
      content,
      authorId: session.user.id,
    },
  })

  revalidateAnnouncementPaths()
  return { success: true }
}

export async function deleteAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }
  if (!canPostAnnouncement(session.user.role, session.user.isBoardMember)) return { success: false }

  const announcement = await db.announcement.findUnique({ where: { id } })
  if (!announcement || announcement.orgId !== session.user.orgId) return { success: false }

  await db.announcement.delete({ where: { id } })

  revalidateAnnouncementPaths()
  return { success: true }
}
