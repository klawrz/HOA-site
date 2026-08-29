"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { serializeVisibleRoles } from "@/lib/audience"
import type { Role } from "@/generated/prisma"

// Same "who can file paperwork" gate already established for AGM key dates
// and documents - Board, PM, and Account Owner can all add calendar-style
// entries (meetings, payment dates, maintenance, inspections).
function canManageCustomKeyDates(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || isBoardMember || role === "ACCOUNT_OWNER" || role === "PROPERTY_MANAGER"
}

function revalidateKeyDatePaths() {
  revalidatePath("/dashboard/board/key-info")
  revalidatePath("/dashboard/property-manager/key-info")
  revalidatePath("/dashboard/owner/governance")
}

export async function createCustomKeyDate(data: {
  title: string
  date: string
  time?: string
  location?: string
  notes?: string
  visibleRoles?: Role[] | null
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageCustomKeyDates(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }

  const title = data.title.trim()
  if (!title) return { success: false, error: "Title is required" }
  if (!data.date) return { success: false, error: "Date is required" }
  const combined = data.time ? new Date(`${data.date}T${data.time}`) : new Date(`${data.date}T00:00`)
  if (isNaN(combined.getTime())) return { success: false, error: "Invalid date" }

  await db.customKeyDate.create({
    data: {
      orgId: session.user.orgId,
      title,
      date: combined,
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
      visibleRoles: serializeVisibleRoles(data.visibleRoles),
      createdById: session.user.id,
    },
  })

  revalidateKeyDatePaths()
  return { success: true }
}

export async function deleteCustomKeyDate(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageCustomKeyDates(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }

  const entry = await db.customKeyDate.findUnique({ where: { id } })
  if (!entry || entry.orgId !== session.user.orgId) return { success: false }

  await db.customKeyDate.delete({ where: { id } })

  revalidateKeyDatePaths()
  return { success: true }
}
