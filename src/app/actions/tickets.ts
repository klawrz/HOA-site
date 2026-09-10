"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Currency, Role, TicketPriority, TicketScope, TicketStatus } from "@/generated/prisma"
import { canEditTicketRecord } from "@/lib/ticket-access"
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
function canCreateTicket(role: Role | null, scope: TicketScope) {
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
function canManageTicket(role: Role | null, scope: TicketScope) {
  if (role === "PROPERTY_MANAGER") return true
  if (role === "BOARD_MEMBER" && scope === "COMMON_AREA") return true
  return false
}

// Entering a cost-to-resolve estimate is a management judgement - PM or
// Board member only, never the originator.
function canEstimateTicket(role: Role | null, isBoardMember?: boolean) {
  return role === "PROPERTY_MANAGER" || role === "BOARD_MEMBER" || Boolean(isBoardMember)
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

  // Assigning work reactivates a deferred ticket; otherwise leave the
  // lifecycle state alone.
  if (ticket.status === "DEFERRED") {
    await db.troubleTicket.update({ where: { id: ticketId }, data: { status: "ACTIVE" } })
  }

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

  if (!isAssignedContractor && !canEditTicketRecord(session.user, ticket)) {
    return { success: false }
  }

  await db.troubleTicket.update({
    where: { id: ticketId },
    data: { status, resolvedAt: status === "CLOSED" ? new Date() : null },
  })

  revalidateTicketPaths()
  return { success: true }
}

export async function editTicketDetails(
  ticketId: string,
  data: { title: string; description: string },
) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false, error: "Not signed in" }

  const ticket = await db.troubleTicket.findFirst({
    where: { id: ticketId, orgId: session.user.orgId },
  })
  if (!ticket) return { success: false, error: "Ticket not found" }
  if (!canEditTicketRecord(session.user, ticket)) {
    return { success: false, error: "You can't edit this ticket" }
  }

  const title = data.title.trim()
  const description = data.description.trim()
  if (!title || !description) {
    return { success: false, error: "Title and description are both required" }
  }

  await db.troubleTicket.update({
    where: { id: ticketId },
    data: { title, description },
  })

  revalidateTicketPaths()
  return { success: true }
}

export async function setTicketCostEstimate(
  ticketId: string,
  data: { cost: number | null; note?: string; currency?: Currency },
) {
  const session = await auth()
  if (!session?.user.orgId) return { success: false, error: "Not signed in" }
  if (!canEstimateTicket(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Only the Property Manager or a Board member can set an estimate" }
  }

  const ticket = await db.troubleTicket.findFirst({
    where: { id: ticketId, orgId: session.user.orgId },
  })
  if (!ticket) return { success: false, error: "Ticket not found" }

  const cost =
    data.cost != null && Number.isFinite(data.cost) && data.cost >= 0 ? data.cost : null

  const org = await db.organization.findUnique({
    where: { id: session.user.orgId },
    select: { baseCurrency: true },
  })
  const currency: Currency =
    data.currency === "USD" || data.currency === "MXN"
      ? data.currency
      : org?.baseCurrency ?? "USD"

  await db.troubleTicket.update({
    where: { id: ticketId },
    data: {
      costEstimate: cost,
      costEstimateNote: data.note?.trim() || null,
      costEstimateAt: cost == null ? null : new Date(),
      costEstimateCurrency: cost == null ? null : currency,
    },
  })

  revalidateTicketPaths()
  return { success: true }
}
