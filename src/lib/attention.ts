import { db } from "@/lib/db"
import { getExpiryStatus } from "@/lib/expiry-status"

export type AttentionSeverity = "expired" | "expiring" | "overdue" | "over_budget"

export interface AttentionItem {
  severity: AttentionSeverity
  title: string
  detail: string
  href: string
}

const severityLabel: Record<AttentionSeverity, string> = {
  expired: "Expired",
  expiring: "Expiring Soon",
  overdue: "Overdue",
  over_budget: "Over Budget",
}

export const attentionSeverityLabel = severityLabel

const severityRank: Record<AttentionSeverity, number> = {
  expired: 0,
  overdue: 1,
  over_budget: 2,
  expiring: 3,
}

// Everything here is deliberately in-app only, computed fresh on each load -
// no email/SMS is sent (that depends on infrastructure not yet in place).
// The goal is just to stop these from being purely passive badges someone
// has to remember to go look at: put them somewhere Board/PM already land.
export async function getAttentionItems(orgId: string, portalBase: string): Promise<AttentionItem[]> {
  const now = new Date()
  const items: AttentionItem[] = []

  const [complianceDocs, contracts, overdueAssessments, operatingBudget] = await Promise.all([
    db.complianceDocument.findMany({ where: { orgId, expiresAt: { not: null } } }),
    db.contract.findMany({ where: { orgId, endDate: { not: null }, status: "ACTIVE" } }),
    db.assessment.findMany({
      where: { orgId, status: "ISSUED", dueDate: { lt: now } },
      include: { charges: true },
    }),
    db.budget.findFirst({
      where: { orgId, status: "APPROVED", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: { year: "desc" },
    }),
  ])

  for (const doc of complianceDocs) {
    const status = getExpiryStatus(doc.expiresAt, doc.reminderDaysBefore)
    if (status === "EXPIRED" || status === "EXPIRING_SOON") {
      items.push({
        severity: status === "EXPIRED" ? "expired" : "expiring",
        title: doc.title,
        detail: status === "EXPIRED" ? "Compliance document has expired" : "Compliance document expiring soon",
        href: `${portalBase}/compliance`,
      })
    }
  }

  for (const c of contracts) {
    const status = getExpiryStatus(c.endDate, c.reminderDaysBefore)
    if (status === "EXPIRED" || status === "EXPIRING_SOON") {
      items.push({
        severity: status === "EXPIRED" ? "expired" : "expiring",
        title: c.title,
        detail: status === "EXPIRED" ? "Contract has ended" : "Contract ending soon",
        href: `${portalBase}/contracts`,
      })
    }
  }

  for (const a of overdueAssessments) {
    const unpaidCount = a.charges.filter((c) => c.amountPaid < c.amountDue).length
    if (unpaidCount > 0) {
      items.push({
        severity: "overdue",
        title: a.title,
        detail: `${unpaidCount} of ${a.charges.length} unit${a.charges.length !== 1 ? "s" : ""} past due`,
        href: `${portalBase}/finances/assessments/${a.id}`,
      })
    }
  }

  if (operatingBudget) {
    const overBudgetItems = operatingBudget.lineItems.filter(
      (i) => i.actualAmount != null && i.actualAmount > i.budgetedAmount
    )
    if (overBudgetItems.length > 0) {
      items.push({
        severity: "over_budget",
        title: `${operatingBudget.year} Operating Budget`,
        detail: `${overBudgetItems.map((i) => i.label).join(", ")} trending over budget`,
        href: `${portalBase}/finances/${operatingBudget.id}`,
      })
    }
  }

  return items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}
