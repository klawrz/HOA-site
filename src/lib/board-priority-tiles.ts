import { db } from "@/lib/db"
import { getExpiryStatus, type ExpiryStatus } from "@/lib/expiry-status"

// Data behind the Board section's persistent priority-tile row (see
// components/board/priority-tiles.tsx). Lives in the Board layout so the
// same five tiles - Finances, Property Management, Units, Employees, AGM -
// sit across the top of every Board page for instant access, the same way
// the Owner and PM sections have their own quick-link rows in their
// layouts. Every query here is a count or a single findFirst, all run in
// parallel, so the per-page cost is small.
export interface BoardPriorityTileData {
  reserveBalance: number
  reserveTarget: number | null
  overBudgetCount: number
  pmName: string | null
  pmStatus: ExpiryStatus | null
  hasPM: boolean
  unitCount: number
  rentedCount: number
  activeEmployeeCount: number
  agmDate: Date | null
  agmDays: number | null
}

export async function getBoardPriorityTileData(orgId: string): Promise<BoardPriorityTileData> {
  const now = new Date()

  const [unitCount, rentedCount, activeEmployeeCount, activePMContract, agm, reserveTransactions, org, operatingBudget] =
    await Promise.all([
      db.unit.count({ where: { orgId } }),
      db.unit.count({ where: { orgId, status: "RENTED" } }),
      // Current staff = anyone not marked FORMER (on-leave people still
      // count as employed).
      db.employee.count({ where: { orgId, status: { not: "FORMER" } } }),
      db.pMContract.findFirst({
        where: { orgId, status: "ACTIVE" },
        include: { company: true },
        orderBy: { startDate: "desc" },
      }),
      db.keyDate.findUnique({ where: { orgId_type: { orgId, type: "AGM" } } }),
      db.reserveTransaction.findMany({ where: { orgId }, select: { type: true, amount: true } }),
      db.organization.findUnique({ where: { id: orgId }, select: { reserveTarget: true } }),
      db.budget.findFirst({
        where: { orgId, status: "APPROVED", type: "OPERATING" },
        include: { lineItems: true },
        orderBy: { year: "desc" },
      }),
    ])

  const reserveBalance = reserveTransactions.reduce(
    (s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount),
    0
  )
  const overBudgetCount = operatingBudget
    ? operatingBudget.lineItems.filter((i) => i.actualAmount != null && i.actualAmount > i.budgetedAmount).length
    : 0
  const agmDays = agm ? Math.ceil((agm.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

  return {
    reserveBalance,
    reserveTarget: org?.reserveTarget ?? null,
    overBudgetCount,
    pmName: activePMContract?.company?.legalName ?? null,
    pmStatus: activePMContract?.endDate ? getExpiryStatus(activePMContract.endDate, 30) : null,
    hasPM: !!activePMContract,
    unitCount,
    rentedCount,
    activeEmployeeCount,
    agmDate: agm?.date ?? null,
    agmDays,
  }
}
