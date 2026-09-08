import { db } from "@/lib/db"
import { getExpiryStatus, type ExpiryStatus } from "@/lib/expiry-status"

// Structured "state of property management" for one org, gathered from the
// same models the individual pages read. This is the input to the AI
// situation panel (src/components/pm/pm-situation-panel.tsx) - and it's
// also enough on its own to render a deterministic fallback when no
// Anthropic key is configured.
export interface PMSituationData {
  orgName: string
  activePM: { name: string; endDate: string | null; daysUntilEnd: number | null; approved: boolean } | null
  pendingPM: { name: string } | null // a PMContract in PENDING = a renewal/replacement in motion
  openTickets: number
  urgentTickets: number
  oldestOpenTicket: { title: string; ageDays: number } | null
  insurance: { status: ExpiryStatus; endDate: string | null } | null
  propertyContracts: { total: number; expiringOrExpired: number }
  contractors: number
}

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

export async function getPMSituationData(orgId: string): Promise<PMSituationData> {
  const now = new Date()

  const [org, activePMContract, pendingPMContract, openTickets, urgentTickets, oldestOpen, insuranceContract, propertyContracts, contractorCount] =
    await Promise.all([
      db.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
      db.pMContract.findFirst({
        where: { orgId, status: "ACTIVE" },
        include: { company: true },
        orderBy: { startDate: "desc" },
      }),
      db.pMContract.findFirst({
        where: { orgId, status: "PENDING" },
        include: { company: true },
        orderBy: { createdAt: "desc" },
      }),
      db.troubleTicket.count({ where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      db.troubleTicket.count({
        where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] }, priority: { in: ["URGENT", "EMERGENCY"] } },
      }),
      db.troubleTicket.findFirst({
        where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "asc" },
        select: { title: true, createdAt: true },
      }),
      db.contract.findFirst({
        where: {
          orgId,
          scope: "PROPERTY",
          status: "ACTIVE",
          OR: [{ contractor: { category: "INSURANCE" } }, { title: { contains: "insurance" } }],
        },
        orderBy: { startDate: "desc" },
      }),
      db.contract.findMany({
        where: { orgId, scope: "PROPERTY", status: "ACTIVE" },
        select: { endDate: true, reminderDaysBefore: true },
      }),
      db.membership.count({ where: { orgId, role: "CONTRACTOR" } }),
    ])

  const expiringOrExpired = propertyContracts.filter((c) => {
    const s = getExpiryStatus(c.endDate, c.reminderDaysBefore)
    return s === "EXPIRED" || s === "EXPIRING_SOON"
  }).length

  return {
    orgName: org?.name ?? "the HOA",
    activePM: activePMContract
      ? {
          name: activePMContract.company.legalName,
          endDate: activePMContract.endDate ? activePMContract.endDate.toISOString().slice(0, 10) : null,
          daysUntilEnd: activePMContract.endDate ? daysBetween(activePMContract.endDate, now) : null,
          approved: !!activePMContract.approvedAt,
        }
      : null,
    pendingPM: pendingPMContract ? { name: pendingPMContract.company.legalName } : null,
    openTickets,
    urgentTickets,
    oldestOpenTicket: oldestOpen ? { title: oldestOpen.title, ageDays: daysBetween(now, oldestOpen.createdAt) } : null,
    insurance: insuranceContract
      ? {
          status: getExpiryStatus(insuranceContract.endDate, insuranceContract.reminderDaysBefore),
          endDate: insuranceContract.endDate ? insuranceContract.endDate.toISOString().slice(0, 10) : null,
        }
      : null,
    propertyContracts: { total: propertyContracts.length, expiringOrExpired },
    contractors: contractorCount,
  }
}

// Deterministic summary - used verbatim when there's no Anthropic key, and
// handed to the model as a baseline it can improve on.
export function describePMSituation(d: PMSituationData): string {
  const parts: string[] = []

  if (!d.activePM) {
    parts.push("No active Property Manager contract is on file.")
  } else {
    const term =
      d.activePM.daysUntilEnd == null
        ? `${d.activePM.name} is the PM (no end date recorded)`
        : d.activePM.daysUntilEnd < 0
          ? `${d.activePM.name}'s contract ended ${-d.activePM.daysUntilEnd} days ago`
          : `${d.activePM.name}'s contract runs another ${d.activePM.daysUntilEnd} days`
    parts.push(`${term}${d.activePM.approved ? "" : " and is not yet Board-approved"}.`)
  }
  if (d.pendingPM) parts.push(`A replacement/renewal with ${d.pendingPM.name} is pending Board approval.`)

  if (d.openTickets === 0) parts.push("No open trouble tickets.")
  else {
    const urgent = d.urgentTickets > 0 ? `, ${d.urgentTickets} urgent` : ""
    const oldest = d.oldestOpenTicket
      ? ` Oldest: "${d.oldestOpenTicket.title}", open ${d.oldestOpenTicket.ageDays} days.`
      : ""
    parts.push(`${d.openTickets} open ticket${d.openTickets === 1 ? "" : "s"}${urgent}.${oldest}`)
  }

  if (!d.insurance) parts.push("No active property insurance contract is on file.")
  else if (d.insurance.status === "EXPIRED") parts.push("Property insurance has expired.")
  else if (d.insurance.status === "EXPIRING_SOON") parts.push("Property insurance is expiring soon.")

  if (d.propertyContracts.expiringOrExpired > 0)
    parts.push(`${d.propertyContracts.expiringOrExpired} property contract${d.propertyContracts.expiringOrExpired === 1 ? "" : "s"} expired or expiring soon.`)

  return parts.join(" ")
}
