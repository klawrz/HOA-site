"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

function canManageGovernance(role: string | null, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || isBoardMember
}

export async function createMeeting(data: {
  title: string
  date: string
  location: string
  agenda: string
  attendees: string
}) {
  const session = await auth()
  if (!session || !session.user.orgId || !canManageGovernance(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  await db.meeting.create({
    data: {
      orgId: session.user.orgId,
      title: data.title,
      date: new Date(data.date),
      location: data.location || null,
      agenda: data.agenda || null,
      attendees: data.attendees || null,
    },
  })

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
