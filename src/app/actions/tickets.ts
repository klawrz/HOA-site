"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Role, TicketPriority, TicketScope, TicketStatus } from "@/generated/prisma"
import { revalidatePath } from "next/cache"

const TICKET_PATHS = [
  "/dashboard/renter/tickets",
  "/dashboard/owner/tickets",
  "/dashboard/property-manager/tickets",
  "/dashboard/board/tickets",
  "/dashboard/contractor/tickets",
]

function revalidateTicketPaths() {
  for (const path of TICKET_PATHS) revalidatePath(path)
}

// Span of control: who may create a request of a given scope.
// Contractors fulfill requests, they don't originate them. Common-area
// requests are a stakeholder concern (owner/board/management), not a
// renter one.
function canCreateTicket(role: Role, scope: TicketScope) {
  if (role === "CONTRACTOR") return false
  if (scope === "COMMON_AREA") {
    return role === "OWNER" || role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER"
  }
  return true
}

// Span of control: who may assign a contractor or change priority.
// Property Manager has authority over everything; Board Member's
// authority is scoped to common-property requests only. Unit Managers
// never get assign/prioritize authority - same limited scope as an
// Owner or Renter submitting their own ticket.
function canManageTicket(role: Role, scope: TicketScope) {
  if (role === "PROPERTY_MANAGER") return true
  if (role === "BOARD_MEMBER" && scope === "COMMON_AREA") return true
  return false
}

// A Unit Manager's authority is per-unit and comes entirely from a grant
// the unit's Owner assigned (see actions/unit-profile.ts) - not from role
// alone, since the Owner retains control of who can do what for their unit.
async function unitManagerCanManageTickets(userId: string, unitId: string) {
  const assignment = await db.unitManagerAssignment.findUnique({
    where: { unitId_userId: { unitId, userId } },
    include: { grants: true },
  })
  return assignment?.grants.some((g) => g.area === "TICKETS" && g.level === "MANAGE") ?? false
}

export async function submitTicket(data: {
  scope: TicketScope
  unitId?: string
  title: string
  description: string
  priority: TicketPriority
}) {
  const session = await auth()
  if (!session || !session.user.orgId) return { success: false }

  if (session.user.role === "UNIT_MANAGER") {
    if (data.scope !== "UNIT" || !data.unitId) return { success: false }
    if (!(await unitManagerCanManageTickets(session.user.id, data.unitId))) return { success: false }
  } else if (!canCreateTicket(session.user.role, data.scope)) {
    return { success: false }
  }
  if (data.scope === "UNIT" && !data.unitId) return { success: false }

  await db.troubleTicket.create({
    data: {
      orgId: session.user.orgId,
      unitId: data.scope === "UNIT" ? data.unitId : null,
      scope: data.scope,
      submittedById: session.user.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
    },
  })

  revalidateTicketPaths()
  return { success: true }
}

export async function assignTicket(ticketId: string, contractorId: string) {
  const session = await auth()
  if (!session) return { success: false }

  const ticket = await db.troubleTicket.findUnique({ where: { id: ticketId } })
  if (!ticket || !canManageTicket(session.user.role, ticket.scope)) return { success: false }

  await db.ticketAssignment.create({
    data: { ticketId, contractorId },
  })

  await db.troubleTicket.update({
    where: { id: ticketId },
    data: { status: "IN_PROGRESS" },
  })

  revalidateTicketPaths()
  return { success: true }
}

export async function updateTicketPriority(ticketId: string, priority: TicketPriority) {
  const session = await auth()
  if (!session) return { success: false }

  const ticket = await db.troubleTicket.findUnique({ where: { id: ticketId } })
  if (!ticket || !canManageTicket(session.user.role, ticket.scope)) return { success: false }

  await db.troubleTicket.update({ where: { id: ticketId }, data: { priority } })

  revalidateTicketPaths()
  return { success: true }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const session = await auth()
  if (!session) return { success: false }

  const ticket = await db.troubleTicket.findUnique({
    where: { id: ticketId },
    include: { assignments: true },
  })
  if (!ticket) return { success: false }

  const isAssignedContractor =
    session.user.role === "CONTRACTOR" &&
    ticket.assignments.some((a) => a.contractorId === session.user.id)

  if (!isAssignedContractor && !canManageTicket(session.user.role, ticket.scope)) {
    return { success: false }
  }

  const data: { status: TicketStatus; resolvedAt?: Date } = { status }
  if (status === "RESOLVED" || status === "CLOSED") {
    data.resolvedAt = new Date()
  }

  await db.troubleTicket.update({ where: { id: ticketId }, data })

  revalidateTicketPaths()
  return { success: true }
}
