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
  if (session.user.role !== "BOARD_MEMBER" && !session.user.isBoardMember) return { success: false }

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
    },
  })

  revalidatePath("/dashboard/board")
  revalidatePath("/dashboard/board/documents")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  revalidatePath("/dashboard/property-manager/documents")
  return { success: true }
}
