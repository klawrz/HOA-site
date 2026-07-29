"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { parseDateOnly } from "@/lib/occupancy"

function revalidateBoardPaths() {
  revalidatePath("/dashboard/account/board")
  revalidatePath("/dashboard/owner/governance")
}

export async function createBoardPosition(data: {
  title: string
  userId?: string
  termStart: string
  termEnd?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  const title = data.title.trim()
  if (!title) return { success: false, error: "Title required" }

  if (data.userId) {
    const member = await db.user.findUnique({ where: { id: data.userId } })
    if (!member || member.orgId !== session.user.orgId) return { success: false, error: "Invalid member" }
  }

  await db.boardPosition.create({
    data: {
      orgId: session.user.orgId,
      title,
      userId: data.userId || null,
      termStart: parseDateOnly(data.termStart),
      termEnd: data.termEnd ? parseDateOnly(data.termEnd) : null,
      notes: data.notes || null,
    },
  })

  // One-time convenience default when a seat is filled - not tied to the
  // term afterward, so removing/ending the term later doesn't revoke it.
  if (data.userId) {
    await db.user.update({ where: { id: data.userId }, data: { isBoardMember: true } })
  }

  revalidateBoardPaths()
  return { success: true }
}

export async function updateBoardPosition(
  id: string,
  data: { title: string; userId?: string; termStart: string; termEnd?: string; notes?: string }
) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  const position = await db.boardPosition.findUnique({ where: { id } })
  if (!position || position.orgId !== session.user.orgId) return { success: false }

  const title = data.title.trim()
  if (!title) return { success: false, error: "Title required" }

  if (data.userId) {
    const member = await db.user.findUnique({ where: { id: data.userId } })
    if (!member || member.orgId !== session.user.orgId) return { success: false, error: "Invalid member" }
  }

  await db.boardPosition.update({
    where: { id },
    data: {
      title,
      userId: data.userId || null,
      termStart: parseDateOnly(data.termStart),
      termEnd: data.termEnd ? parseDateOnly(data.termEnd) : null,
      notes: data.notes || null,
    },
  })

  if (data.userId) {
    await db.user.update({ where: { id: data.userId }, data: { isBoardMember: true } })
  }

  revalidateBoardPaths()
  return { success: true }
}

export async function deleteBoardPosition(id: string) {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") return { success: false }

  const position = await db.boardPosition.findUnique({ where: { id } })
  if (!position || position.orgId !== session.user.orgId) return { success: false }

  await db.boardPosition.delete({ where: { id } })

  revalidateBoardPaths()
  return { success: true }
}
