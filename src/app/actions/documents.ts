"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { DocumentCategory } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

export async function createDocument(data: {
  title: string
  category: DocumentCategory
  description: string
  content: string
  fileUrl: string
}) {
  const session = await auth()
  if (!session || !session.user.orgId) return { success: false }
  if (session.user.role !== "BOARD_MEMBER" && !session.user.isBoardMember) return { success: false }

  await db.document.create({
    data: {
      orgId: session.user.orgId,
      title: data.title,
      category: data.category,
      description: data.description || null,
      content: data.content || null,
      fileUrl: data.fileUrl || null,
      uploadedById: session.user.id,
    },
  })

  revalidatePath("/dashboard/board")
  revalidatePath("/dashboard/board/documents")
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board")
  return { success: true }
}
