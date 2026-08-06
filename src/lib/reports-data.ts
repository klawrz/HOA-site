import { db } from "@/lib/db"
import { computeReserveYearRows, reserveYearRange } from "@/lib/reserve-fund"
import { getExpiryStatus, type ExpiryStatus } from "@/lib/expiry-status"

// Safe subset of User fields for anything embedded in a report - never
// includes password, matching the same care taken in getFullOrgDataExport.
const safeUser = { select: { id: true, name: true, email: true, phone: true } }

function sumAmount<T extends { amountDue: number; amountPaid: number }>(charges: T[]) {
  const totalCharged = charges.reduce((s, c) => s + c.amountDue, 0)
  const totalCollected = charges.reduce((s, c) => s + c.amountPaid, 0)
  return { totalCharged, totalCollected, outstanding: totalCharged - totalCollected }
}

export async function getFinancialReportData(orgId: string) {
  const [org, reserveTransactions, reserveYearNotes, operatingBudget, capitalBudget, assessments] =
    await Promise.all([
      db.organization.findUnique({ where: { id: orgId } }),
      db.reserveTransaction.findMany({ where: { orgId } }),
      db.reserveYearNote.findMany({ where: { orgId } }),
      db.budget.findFirst({
        where: { orgId, status: "APPROVED", type: "OPERATING" },
        include: { lineItems: { orderBy: { sortOrder: "asc" } } },
        orderBy: { year: "desc" },
      }),
      db.budget.findFirst({
        where: { orgId, status: "APPROVED", type: "CAPITAL" },
        include: { lineItems: { orderBy: { sortOrder: "asc" } } },
        orderBy: { year: "desc" },
      }),
      db.assessment.findMany({
        where: { orgId },
        include: { charges: true },
        orderBy: { dueDate: "desc" },
      }),
    ])

  const reserveBalance = reserveTransactions.reduce(
    (s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount),
    0
  )
  const reserveYearRows = computeReserveYearRows(reserveTransactions, reserveYearRange())
  const comments = new Map(reserveYearNotes.map((n) => [n.year, n.comment]))

  const assessmentRows = assessments.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    dueDate: a.dueDate,
    totalAmount: a.totalAmount,
    ...sumAmount(a.charges),
  }))
  const assessmentTotals = sumAmount(assessments.flatMap((a) => a.charges))

  function budgetSummary(budget: typeof operatingBudget) {
    if (!budget) return null
    const budgeted = budget.lineItems.reduce((s, li) => s + li.budgetedAmount, 0)
    const actual = budget.lineItems.reduce((s, li) => s + (li.actualAmount ?? 0), 0)
    return {
      id: budget.id,
      year: budget.year,
      version: budget.version,
      lineItems: budget.lineItems,
      budgeted,
      actual,
      variance: budgeted - actual,
    }
  }

  return {
    org,
    reserveBalance,
    reserveTarget: org?.reserveTarget ?? null,
    reserveHeldAt: org?.reserveHeldAt ?? null,
    reserveYearRows,
    reserveYearComments: comments,
    budgets: { operating: budgetSummary(operatingBudget), capital: budgetSummary(capitalBudget) },
    assessments: assessmentRows,
    assessmentTotals,
  }
}

export interface ContractRow {
  id: string
  title: string
  type: string
  status: string
  startDate: Date
  endDate: Date | null
  amount: number | null
  contractor: { name: string | null; email: string } | null
  unitNumber: string | null
  expiryStatus: ExpiryStatus
}

export async function getOperationsReportData(orgId: string) {
  const [contracts, activePMContract, tickets, meetings, complianceDocuments] = await Promise.all([
    db.contract.findMany({
      where: { orgId },
      include: { contractor: safeUser, unit: { select: { number: true } } },
      orderBy: { endDate: "asc" },
    }),
    db.pMContract.findFirst({
      where: { orgId, status: "ACTIVE" },
      include: { company: true },
      orderBy: { startDate: "desc" },
    }),
    db.troubleTicket.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } }),
    db.meeting.findMany({ where: { orgId }, orderBy: { date: "desc" } }),
    db.complianceDocument.findMany({ where: { orgId } }),
  ])

  const contractRows: ContractRow[] = contracts.map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    amount: c.amount,
    contractor: c.contractor,
    unitNumber: c.unit?.number ?? null,
    expiryStatus: getExpiryStatus(c.endDate, c.reminderDaysBefore),
  }))

  const now = new Date()
  const ticketsByStatus = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 }
  const ticketsByPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0, EMERGENCY: 0 }
  for (const t of tickets) {
    ticketsByStatus[t.status]++
    ticketsByPriority[t.priority]++
  }
  const openTickets = tickets
    .filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
    .map((t) => ({
      ...t,
      ageDays: Math.floor((now.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    }))

  const upcomingMeetings = meetings.filter((m) => m.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime())
  const pastMeetings = meetings.filter((m) => m.date < now)

  const complianceRows = complianceDocuments.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    expiresAt: d.expiresAt,
    expiryStatus: getExpiryStatus(d.expiresAt, d.reminderDaysBefore),
  }))

  return {
    contracts: contractRows,
    activePMContract,
    ticketsByStatus,
    ticketsByPriority,
    openTickets,
    upcomingMeetings,
    pastMeetings,
    complianceRows,
  }
}

// Everything scoped to this org, for a complete portable export. Explicitly
// never includes User.password, Invite.token, or PasswordResetToken - those
// models/fields are simply never queried here.
export async function getFullOrgDataExport(orgId: string) {
  const [
    org,
    units,
    memberships,
    boardPositions,
    budgets,
    assessments,
    reserveTransactions,
    reserveYearNotes,
    contracts,
    pmContracts,
    tickets,
    meetings,
    documents,
    complianceDocuments,
    announcements,
    keyContacts,
  ] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId } }),
    db.unit.findMany({ where: { orgId } }),
    db.membership.findMany({ where: { orgId }, include: { user: safeUser } }),
    db.boardPosition.findMany({ where: { orgId }, include: { user: safeUser } }),
    db.budget.findMany({ where: { orgId }, include: { lineItems: true } }),
    db.assessment.findMany({ where: { orgId }, include: { charges: true } }),
    db.reserveTransaction.findMany({ where: { orgId } }),
    db.reserveYearNote.findMany({ where: { orgId } }),
    db.contract.findMany({ where: { orgId }, include: { contractor: safeUser } }),
    db.pMContract.findMany({ where: { orgId }, include: { company: true } }),
    db.troubleTicket.findMany({
      where: { orgId },
      include: { assignments: true, comments: true, submittedBy: safeUser },
    }),
    db.meeting.findMany({ where: { orgId } }),
    db.document.findMany({ where: { orgId } }),
    db.complianceDocument.findMany({ where: { orgId } }),
    db.announcement.findMany({ where: { orgId } }),
    db.keyContact.findMany({ where: { orgId } }),
  ])

  return {
    exportedAt: new Date(),
    organization: org,
    units,
    members: memberships,
    boardPositions,
    budgets,
    assessments,
    reserveTransactions,
    reserveYearNotes,
    contracts,
    pmContracts,
    troubleTickets: tickets,
    meetings,
    documents,
    complianceDocuments,
    announcements,
    keyContacts,
  }
}
