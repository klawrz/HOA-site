"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { resolveFileUrl } from "@/lib/file-upload"

// Same "who can file paperwork" gate as documents.ts - Board, PM, and
// Account Owner can all set up AGM details; PM in particular often
// handles the logistics (booking the venue, preparing proxy forms).
function canManageKeyDates(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || isBoardMember || role === "ACCOUNT_OWNER" || role === "PROPERTY_MANAGER"
}

function revalidateKeyDatePaths() {
  revalidatePath("/dashboard/board/key-info")
  revalidatePath("/dashboard/board/key-info/agm")
  revalidatePath("/dashboard/property-manager/key-info")
  revalidatePath("/dashboard/property-manager/key-info/agm")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/agm")
}

export async function upsertAgmKeyDate(formData: FormData) {
  const session = await auth()
  if (!session?.user.orgId || !canManageKeyDates(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const orgId = session.user.orgId

  const date = formData.get("date") as string
  const time = (formData.get("time") as string) || ""
  if (!date) return { success: false, error: "Date is required" }
  const combined = time ? new Date(`${date}T${time}`) : new Date(`${date}T00:00`)
  if (isNaN(combined.getTime())) return { success: false, error: "Invalid date/time" }

  const proxyFile = await resolveFileUrl(formData, (formData.get("proxyFormUrl") as string) || null, "key-dates")
  if (!proxyFile.success) return { success: false, error: proxyFile.error }

  const location = (formData.get("location") as string) || null
  const agenda = (formData.get("agenda") as string) || null

  const existing = await db.keyDate.findUnique({ where: { orgId_type: { orgId, type: "AGM" } } })

  // Whichever door someone came through - this dialog, or the "New
  // Meeting" dialog with type AGM - an AGM ends up with a linked Meeting
  // row, since that's what documents (Document.meetingId) and minutes
  // (Meeting.minutes) hang off of. Only created once; an existing link is
  // left alone so it keeps whatever minutes/documents have already been
  // filed against it. Its date/location/agenda are kept in sync on every
  // save so the Meetings list and minutes page don't show a stale date.
  let meetingId = existing?.meetingId ?? null
  if (meetingId) {
    await db.meeting.update({ where: { id: meetingId }, data: { date: combined, location, agenda } })
  } else {
    const meeting = await db.meeting.create({
      data: { orgId, title: "Annual General Meeting", type: "AGM", date: combined, location, agenda },
    })
    meetingId = meeting.id
  }

  await db.keyDate.upsert({
    where: { orgId_type: { orgId, type: "AGM" } },
    update: {
      date: combined,
      location,
      chairpersonName: (formData.get("chairpersonName") as string) || null,
      agenda,
      proxyProcess: (formData.get("proxyProcess") as string) || null,
      proxyFormUrl: proxyFile.url,
      notes: (formData.get("notes") as string) || null,
      meetingId,
    },
    create: {
      orgId,
      type: "AGM",
      date: combined,
      location,
      chairpersonName: (formData.get("chairpersonName") as string) || null,
      agenda,
      proxyProcess: (formData.get("proxyProcess") as string) || null,
      proxyFormUrl: proxyFile.url,
      notes: (formData.get("notes") as string) || null,
      createdById: session.user.id,
      meetingId,
    },
  })

  revalidateKeyDatePaths()
  revalidatePath("/dashboard/board/meetings")
  return { success: true }
}
