import { db } from "@/lib/db"
import type { Session } from "next-auth"
import { Prisma, TicketStatus } from "@/generated/prisma"

// The augmented Session shape (id/role/orgId/isBoardMember/name/email on
// session.user via src/types/next-auth.d.ts) - every query function below
// takes this and reads scoping fields from it, never from a model-supplied
// argument. That's the whole security model: an LLM calling these tools has
// no way to ask for anyone else's data because the functions themselves
// don't accept an identifier to ask with.
//
// Not `ReturnType<typeof auth>` - NextAuth v5's `auth` export is overloaded
// (plain session getter vs. middleware use in middleware.ts) and
// `ReturnType<typeof auth>` resolves to the wrong overload (NextMiddleware).
export type AskHopeSession = Session

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const

function asTicketStatus(value: unknown): TicketStatus | undefined {
  return typeof value === "string" && (TICKET_STATUSES as readonly string[]).includes(value)
    ? (value as TicketStatus)
    : undefined
}

export async function getOwnerDuesAndPayments(session: AskHopeSession) {
  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true },
    select: { unitId: true },
  })
  const unitIds = ownerships.map((o) => o.unitId)
  if (unitIds.length === 0) return { totalOutstanding: 0, charges: [] }

  const charges = await db.assessmentCharge.findMany({
    where: { unitId: { in: unitIds }, assessment: { status: "ISSUED" } },
    include: { assessment: true, unit: true },
    orderBy: { assessment: { dueDate: "desc" } },
    take: 30,
  })

  const totalOutstanding = charges.reduce((s, c) => s + Math.max(c.amountDue - c.amountPaid, 0), 0)

  return {
    totalOutstanding,
    charges: charges.map((c) => ({
      assessmentTitle: c.assessment.title,
      assessmentType: c.assessment.type,
      unitNumber: c.unit.number,
      amountDue: c.amountDue,
      amountPaid: c.amountPaid,
      outstanding: Math.max(c.amountDue - c.amountPaid, 0),
      dueDate: c.assessment.dueDate.toISOString().slice(0, 10),
    })),
  }
}

export async function getOwnerFinancialSummary(session: AskHopeSession) {
  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true },
    include: {
      unit: {
        include: {
          leases: { where: { isActive: true }, include: { renter: true } },
          contracts: { where: { status: "ACTIVE" }, include: { contractor: true } },
        },
      },
    },
  })

  const totalMonthlyIncome = ownerships
    .flatMap((o) => o.unit.leases)
    .reduce((s, l) => s + (l.monthlyRent ?? 0), 0)

  const activeContracts = ownerships
    .flatMap((o) => o.unit.contracts.map((c) => ({ ...c, unitNumber: o.unit.number })))
    .slice(0, 20)

  return {
    units: ownerships.map((o) => ({
      unitNumber: o.unit.number,
      building: o.unit.building,
      status: o.unit.status,
      monthlyRent: o.unit.leases[0]?.monthlyRent ?? null,
      renterName: o.unit.leases[0]?.renter.name ?? null,
    })),
    totalMonthlyIncome,
    activeContracts: activeContracts.map((c) => ({
      title: c.title,
      unitNumber: c.unitNumber,
      type: c.type,
      amount: c.amount,
      billingPeriod: c.billingPeriod,
      contractorName: c.contractor.name,
    })),
  }
}

export async function getTicketStatus(session: AskHopeSession, args: { status?: unknown } = {}) {
  const statusFilter = asTicketStatus(args.status)
  const conditions: Prisma.TroubleTicketWhereInput[] = []

  if (session.user.role === "RENTER") {
    conditions.push({ submittedById: session.user.id })
  } else {
    const ownerships = await db.unitOwnership.findMany({
      where: { ownerId: session.user.id },
      select: { unitId: true },
    })
    const unitIds = ownerships.map((o) => o.unitId)
    conditions.push({ OR: [{ unitId: { in: unitIds } }, { scope: "COMMON_AREA" }] })
  }
  if (statusFilter) conditions.push({ status: statusFilter })

  const tickets = await db.troubleTicket.findMany({
    where: { AND: conditions },
    include: { unit: true, submittedBy: true },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    take: 20,
  })

  return tickets.map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    unitNumber: t.unit?.number ?? "Common Area",
    submittedBy: t.submittedBy.name ?? t.submittedBy.email,
    createdAt: t.createdAt.toISOString().slice(0, 10),
    description: t.description.slice(0, 300),
  }))
}

export async function getOwnerOccupancySummary(session: AskHopeSession, args: { unitId?: unknown } = {}) {
  const unitId = typeof args.unitId === "string" ? args.unitId : undefined

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true, ...(unitId ? { unitId } : {}) },
    include: {
      unit: {
        include: {
          occupancyEntries: { orderBy: { startDate: "desc" }, take: 10 },
          leases: { where: { isActive: true }, include: { renter: true } },
        },
      },
    },
  })

  return ownerships.map((o) => ({
    unitNumber: o.unit.number,
    building: o.unit.building,
    status: o.unit.status,
    currentRenter: o.unit.leases[0]?.renter.name ?? null,
    recentOccupancy: o.unit.occupancyEntries.map((e) => ({
      type: e.type,
      occupantName: e.occupantName,
      startDate: e.startDate.toISOString().slice(0, 10),
      endDate: e.endDate.toISOString().slice(0, 10),
    })),
  }))
}

// Case-insensitive substring match done in JS, not via Prisma's `mode:
// "insensitive"` - that's a Postgres/MySQL-only option and this app runs
// on SQLite locally (@prisma/adapter-better-sqlite3), where it would throw.
export async function searchDocuments(session: AskHopeSession, args: { query?: unknown } = {}) {
  if (!session.user.orgId) return []
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase().slice(0, 100) : ""
  if (!query) return []

  const canSeeBoardDocs =
    session.user.role === "BOARD_MEMBER" || session.user.role === "PROPERTY_MANAGER" || session.user.isBoardMember

  const documents = await db.document.findMany({
    where: {
      orgId: session.user.orgId,
      ...(canSeeBoardDocs ? {} : { visibility: "OWNERS" }),
    },
    take: 50,
  })

  const matches = documents
    .filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        (d.description ?? "").toLowerCase().includes(query) ||
        (d.content ?? "").toLowerCase().includes(query)
    )
    .slice(0, 5)

  return matches.map((d) => ({
    title: d.title,
    category: d.category,
    description: d.description,
    excerpt: d.content ? d.content.slice(0, 1000) : null,
    hasFile: !!d.fileUrl,
  }))
}

export async function getOrgFinancialSummary(session: AskHopeSession) {
  if (!session.user.orgId) return null
  const orgId = session.user.orgId

  const [budget, reserveTransactions, org] = await Promise.all([
    db.budget.findFirst({
      where: { orgId, status: "APPROVED", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: { year: "desc" },
    }),
    db.reserveTransaction.findMany({ where: { orgId } }),
    db.organization.findUnique({ where: { id: orgId } }),
  ])

  const reserveBalance = reserveTransactions.reduce(
    (s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount),
    0
  )

  return {
    approvedBudget: budget
      ? {
          year: budget.year,
          totalBudgeted: budget.lineItems.reduce((s, i) => s + i.budgetedAmount, 0),
          lineItemCount: budget.lineItems.length,
        }
      : null,
    reserveBalance,
    reserveTarget: org?.reserveTarget ?? null,
  }
}

export async function getOrgDuesStatus(session: AskHopeSession) {
  if (!session.user.orgId) return []

  const assessments = await db.assessment.findMany({
    where: { orgId: session.user.orgId, status: "ISSUED" },
    include: { charges: true },
    orderBy: { dueDate: "desc" },
    take: 10,
  })

  return assessments.map((a) => {
    const totalDue = a.charges.reduce((s, c) => s + c.amountDue, 0)
    const totalPaid = a.charges.reduce((s, c) => s + c.amountPaid, 0)
    return {
      title: a.title,
      type: a.type,
      dueDate: a.dueDate.toISOString().slice(0, 10),
      totalDue,
      totalCollected: totalPaid,
      totalOutstanding: totalDue - totalPaid,
      unitsUnpaid: a.charges.filter((c) => c.amountPaid < c.amountDue).length,
      unitsTotal: a.charges.length,
    }
  })
}

export async function getOrgTicketStatus(session: AskHopeSession, args: { status?: unknown } = {}) {
  if (!session.user.orgId) return []
  const statusFilter = asTicketStatus(args.status)

  const tickets = await db.troubleTicket.findMany({
    where: { orgId: session.user.orgId, ...(statusFilter ? { status: statusFilter } : {}) },
    include: { unit: true, submittedBy: true },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    take: 20,
  })

  return tickets.map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    unitNumber: t.unit?.number ?? "Common Area",
    submittedBy: t.submittedBy.name ?? t.submittedBy.email,
    createdAt: t.createdAt.toISOString().slice(0, 10),
  }))
}
