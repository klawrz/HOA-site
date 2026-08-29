"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { serializeVisibleRoles } from "@/lib/audience"
import type { Role } from "@/generated/prisma"

// Both the Board (formal notices, dues reminders, meeting news) and the
// Property Manager (utility interruptions, access code changes, filter
// reminders) issue news to Owners - unlike Meetings/Documents, which are
// Board-only record-keeping. ACCOUNT_OWNER added 2026-08-28 - every other
// governance-ish action (documents, key dates, meetings) already includes
// the custodian; this one had been missed, which is what actually blocked
// Dara's own live test (he posts as ACCOUNT_OWNER on Sampaguita/
// SampaguitaNEW, not as a Board Member).
function canPostAnnouncement(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || role === "ACCOUNT_OWNER" || isBoardMember
}

function revalidateAnnouncementPaths() {
  revalidatePath("/dashboard/owner")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  revalidatePath("/dashboard/property-manager/announcements")
  revalidatePath("/dashboard/board/announcements")
}

// End-of-day for removeAfter (a post should stay visible through its whole
// last day), start-of-day for postOn (goes live first thing that day) -
// same YYYY-MM-DD <input type="date"> value from the form either way, just
// anchored to a different end of the day depending on which field it is.
function parseDateField(raw: string | null | undefined, endOfDay: boolean): { ok: true; value: Date | null } | { ok: false } {
  if (!raw) return { ok: true, value: null }
  const parsed = new Date(`${raw}T${endOfDay ? "23:59:59" : "00:00:00"}`)
  if (isNaN(parsed.getTime())) return { ok: false }
  return { ok: true, value: parsed }
}

type AnnouncementInput = {
  title: string
  content: string
  visibleRoles?: Role[] | null
  removeAfter?: string | null
  postOn?: string | null
}

export async function createAnnouncement(data: AnnouncementInput) {
  const session = await auth()
  if (!session || !session.user.orgId) return { success: false }
  if (!canPostAnnouncement(session.user.role, session.user.isBoardMember)) return { success: false }

  const org = await db.organization.findUnique({ where: { id: session.user.orgId }, select: { verificationStatus: true } })
  if (org?.verificationStatus !== "VERIFIED") {
    return { success: false, error: "Unverified workspaces cannot send official announcements. Request verification first." }
  }

  const title = data.title.trim()
  const content = data.content.trim()
  if (!title || !content) return { success: false, error: "Title and content required" }

  const removeAfter = parseDateField(data.removeAfter, true)
  if (!removeAfter.ok) return { success: false, error: "Invalid remove-after date" }
  const postOn = parseDateField(data.postOn, false)
  if (!postOn.ok) return { success: false, error: "Invalid post-on date" }

  await db.announcement.create({
    data: {
      orgId: session.user.orgId,
      title,
      content,
      authorId: session.user.id,
      visibleRoles: serializeVisibleRoles(data.visibleRoles),
      removeAfter: removeAfter.value,
      postOn: postOn.value,
    },
  })

  revalidateAnnouncementPaths()
  return { success: true }
}

// Same permission model as archiveAnnouncement (no per-author restriction) -
// any role that can post announcements at all can also edit any of them,
// not just their own, mirroring how delete already works for this feature.
export async function updateAnnouncement(id: string, data: AnnouncementInput) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }
  if (!canPostAnnouncement(session.user.role, session.user.isBoardMember)) return { success: false }

  const existing = await db.announcement.findUnique({ where: { id } })
  if (!existing || existing.orgId !== session.user.orgId) return { success: false }

  const title = data.title.trim()
  const content = data.content.trim()
  if (!title || !content) return { success: false, error: "Title and content required" }

  const removeAfter = parseDateField(data.removeAfter, true)
  if (!removeAfter.ok) return { success: false, error: "Invalid remove-after date" }
  const postOn = parseDateField(data.postOn, false)
  if (!postOn.ok) return { success: false, error: "Invalid post-on date" }

  await db.announcement.update({
    where: { id },
    data: {
      title,
      content,
      visibleRoles: serializeVisibleRoles(data.visibleRoles),
      removeAfter: removeAfter.value,
      postOn: postOn.value,
    },
  })

  revalidateAnnouncementPaths()
  return { success: true }
}

// Soft-delete, not a real db.announcement.delete() - governance
// communications stay retrievable in the Archived section (see Board/PM
// announcements pages) rather than being permanently erased.
export async function archiveAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }
  if (!canPostAnnouncement(session.user.role, session.user.isBoardMember)) return { success: false }

  const announcement = await db.announcement.findUnique({ where: { id } })
  if (!announcement || announcement.orgId !== session.user.orgId) return { success: false }

  await db.announcement.update({ where: { id }, data: { archivedAt: new Date() } })

  revalidateAnnouncementPaths()
  return { success: true }
}

export async function restoreAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false }
  if (!canPostAnnouncement(session.user.role, session.user.isBoardMember)) return { success: false }

  const announcement = await db.announcement.findUnique({ where: { id } })
  if (!announcement || announcement.orgId !== session.user.orgId) return { success: false }

  await db.announcement.update({ where: { id }, data: { archivedAt: null } })

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
