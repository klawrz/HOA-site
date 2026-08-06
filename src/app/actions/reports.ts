"use server"

import { auth } from "@/auth"
import { getFullOrgDataExport } from "@/lib/reports-data"

export async function exportFullOrgData() {
  const session = await auth()
  if (
    !session?.user.orgId ||
    (session.user.role !== "BOARD_MEMBER" && session.user.role !== "PROPERTY_MANAGER")
  ) {
    return { success: false as const }
  }

  const data = await getFullOrgDataExport(session.user.orgId)
  return { success: true as const, data }
}
