"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { MeetingType } from "@/generated/prisma"

// Same "who can file paperwork" gate as documents.ts/key-dates.ts -
// widened 2026-08-27 to also include Account Owner and PM. Previously this
// was Board-only, which is what made an Account Owner's own "New Meeting"
// attempt fail silently (canManageGovernance returned false, the action
// returned {success:false}, all the dialog could show was a generic toast).
function canManageGovernance(role: string | null, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || isBoardMember || role === "ACCOUNT_OWNER" || role === "PROPERTY_MANAGER"
}

export async function createMeeting(data: {
  title: string
  type: MeetingType
  date: string
  location: string
  agenda: string
  attendees: string
}) {
  const session = await auth()
  if (!session || !session.user.orgId || !canManageGovernance(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  const orgId = session.user.orgId
  const date = new Date(data.date)

  const meeting = await db.meeting.create({
    data: {
      orgId,
      title: data.title,
      type: data.type,
      date,
      location: data.location || null,
      agenda: data.agenda || null,
      attendees: data.attendees || null,
    },
  })

  // AGM needs its own richer record (chairperson, proxy process/form,
  // notes) beyond what this generic dialog collects - link it to a KeyDate
  // right away so it shows up on the Key Dates card and the AGM page
  // immediately, ready for the Board/PM/Account Owner to fill in those
  // extra details from there. Doesn't overwrite an existing KeyDate's
  // chairperson/proxy/notes if one is already on file - only the date and
  // the link get set/refreshed.
  if (data.type === "AGM") {
    await db.keyDate.upsert({
      where: { orgId_type: { orgId, type: "AGM" } },
      update: { date, meetingId: meeting.id },
      create: { orgId, type: "AGM", date, meetingId: meeting.id, createdById: session.user.id },
    })
    revalidatePath("/dashboard/board/key-info")
    revalidatePath("/dashboard/board/key-info/agm")
    revalidatePath("/dashboard/property-manager/key-info")
    revalidatePath("/dashboard/property-manager/key-info/agm")
    revalidatePath("/dashboard/owner/governance/agm")
  }

  revalidatePath("/dashboard/board")
  revalidatePath("/dashboard/board/meetings")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  return { success: true }
}

export async function saveMeetingMinutes(meetingId: string, minutes: string) {
  const session = await auth()
  if (!session || !canManageGovernance(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  await db.meeting.update({
    where: { id: meetingId },
    data: { minutes: minutes || null },
  })

  revalidatePath("/dashboard/board/meetings")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  return { success: true }
}
