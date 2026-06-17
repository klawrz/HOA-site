"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { TicketPriority, TicketStatus } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

export async function submitTicket(data: {
  unitId: string
  title: string
  description: string
  priority: TicketPriority
}) {
  const session = await auth()
  if (!session) return { success: false }

  await db.troubleTicket.create({
    data: {
      unitId: data.unitId,
      submittedById: session.user.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
    },
  })

  revalidatePath("/dashboard/renter/tickets")
  revalidatePath("/dashboard/owner/tickets")
  revalidatePath("/dashboard/property-manager/tickets")
  return { success: true }
}

export async function assignTicket(ticketId: string, contractorId: string) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  await db.ticketAssignment.create({
    data: { ticketId, contractorId },
  })

  await db.troubleTicket.update({
    where: { id: ticketId },
    data: { status: "IN_PROGRESS" },
  })

  revalidatePath("/dashboard/property-manager/tickets")
  revalidatePath("/dashboard/contractor/tickets")
  return { success: true }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const session = await auth()
  if (!session) return { success: false }

  const ticket = await db.troubleTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { success: false }

  const data: { status: TicketStatus; resolvedAt?: Date } = { status }
  if (status === "RESOLVED" || status === "CLOSED") {
    data.resolvedAt = new Date()
  }

  await db.troubleTicket.update({ where: { id: ticketId }, data })

  revalidatePath("/dashboard/contractor/tickets")
  revalidatePath("/dashboard/property-manager/tickets")
  return { success: true }
}
