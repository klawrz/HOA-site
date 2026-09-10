import type { Role } from "@/generated/prisma"

// Who may edit a ticket's own fields (title, description, status, cost
// estimate): the Property Manager, any Board member (not scope-limited,
// unlike assign/prioritize), and the person who raised it. Assignment and
// priority stay with canManageTicket in actions/tickets.ts; this is the
// lighter "keep the ticket's details current" authority.
export function canEditTicketRecord(
  user: { id: string; role: Role | null; isBoardMember?: boolean },
  ticket: { submittedById: string },
) {
  if (user.role === "PROPERTY_MANAGER" || user.role === "BOARD_MEMBER" || user.isBoardMember) {
    return true
  }
  return ticket.submittedById === user.id
}
