"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { DocumentCategory, DocumentVisibility } from "@/generated/prisma"
import { revalidatePath } from "next/cache"
import { resolveFileUrl as resolveUploadedFileUrl } from "@/lib/file-upload"

function resolveFileUrl(formData: FormData, fallbackUrl: string | null) {
  return resolveUploadedFileUrl(formData, fallbackUrl, "documents")
}

export async function createDocument(formData: FormData) {
  const session = await auth()
  if (!session || !session.user.orgId) return { success: false }
  // Board-managed in the general case, but the custodian is the one
  // holding the actual paperwork at setup time (constitution, contracts,
  // minutes) before any Board exists to file it themselves - retaining a
  // document isn't a governance decision like approving a budget or PM
  // contract, so letting the Account Owner file it too is just recordkeeping,
  // not a conflict of interest. PM added 2026-08-27 - per Dara, PM usually
  // preps the budget (and other financial/contract paperwork) in
  // conjunction with the Board, so needs to be able to file documents too,
  // not just view them.
  const canFile =
    session.user.role === "BOARD_MEMBER" ||
    session.user.isBoardMember ||
    session.user.role === "ACCOUNT_OWNER" ||
    session.user.role === "PROPERTY_MANAGER"
  if (!canFile) return { success: false }

  const title = formData.get("title") as string
  if (!title?.trim()) return { success: false, error: "Title required" }

  const file = await resolveFileUrl(formData, (formData.get("fileUrl") as string) || null)
  if (!file.success) return { success: false, error: file.error }

  await db.document.create({
    data: {
      orgId: session.user.orgId,
      title,
      category: formData.get("category") as DocumentCategory,
      visibility: (formData.get("visibility") as DocumentVisibility) || "OWNERS",
      description: (formData.get("description") as string) || null,
      content: (formData.get("content") as string) || null,
      fileUrl: file.url,
      uploadedById: session.user.id,
      // Optional - set when filed straight from the AGM page (or any
      // future meeting-scoped upload point) so it shows up in that
      // meeting's "Relevant Documents" list, not just the general repository.
      meetingId: (formData.get("meetingId") as string) || null,
    },
  })

  revalidatePath("/dashboard/board")
  revalidatePath("/dashboard/board/documents")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  revalidatePath("/dashboard/property-manager/documents")
  revalidatePath("/dashboard/board/key-info/agm")
  revalidatePath("/dashboard/property-manager/key-info/agm")
  revalidatePath("/dashboard/owner/governance/agm")
  return { success: true }
}
