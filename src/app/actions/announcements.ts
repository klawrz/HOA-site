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

// Any org member can ask or answer - Owners included - so a question and
// its answer stay attached to the announcement instead of living in one
// board member's inbox, replacing the reply-all/side-channel email pattern.
export async function addAnnouncementComment(announcementId: string, content: string) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }

  const trimmed = content.trim()
  if (!trimmed) return { success: false, error: "Comment can't be empty" }

  const announcement = await db.announcement.findUnique({ where: { id: announcementId } })
  if (!announcement || announcement.orgId !== session.user.orgId) return { success: false }

  await db.announcementComment.create({
    data: { announcementId, authorId: session.user.id, content: trimmed },
  })

  revalidateAnnouncementPaths()
  return { success: true }
}

export async function deleteAnnouncementComment(id: string) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }

  const comment = await db.announcementComment.findUnique({
    where: { id },
    include: { announcement: true },
  })
  if (!comment || comment.announcement.orgId !== session.user.orgId) return { success: false }

  const isAuthor = comment.authorId === session.user.id
  const isModerator = canPostAnnouncement(session.user.role, session.user.isBoardMember)
  if (!isAuthor && !isModerator) return { success: false }

  await db.announcementComment.delete({ where: { id } })

  revalidateAnnouncementPaths()
  return { success: true }
}

// Upserted so viewing the same announcement again is a no-op, not a new
// row - one read receipt per (announcement, user), timestamped on first view.
export async function markAnnouncementRead(announcementId: string) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }

  const announcement = await db.announcement.findUnique({ where: { id: announcementId } })
  if (!announcement || announcement.orgId !== session.user.orgId) return { success: false }

  await db.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId: session.user.id } },
    create: { announcementId, userId: session.user.id },
    update: {},
  })

  return { success: true }
}
