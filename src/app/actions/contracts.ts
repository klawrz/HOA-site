"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createContract(data: {
  title: string
  contractorId: string
  startDate: string
  endDate: string
  amount: string
  description: string
}) {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") return { success: false }

  await db.contract.create({
    data: {
      title: data.title,
      contractorId: data.contractorId,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      amount: data.amount ? parseFloat(data.amount) : null,
      description: data.description || null,
      status: "ACTIVE",
    },
  })

  revalidatePath("/dashboard/board/contracts")
  revalidatePath("/dashboard/contractor")
  return { success: true }
}
