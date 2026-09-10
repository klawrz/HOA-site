import { db } from "@/lib/db"
import { resolveReservePolicy } from "@/lib/reserve-policy-summary"
import { formatMoney } from "@/lib/currency"
import type { Currency } from "@/generated/prisma"

// Board-landing-page alerts. Unlike getAttentionItems (expiring contracts,
// overdue dues, over-budget lines - things with a hard status flag), this
// module *analyses* the financial figures and flags positions that need a
// Board decision: a reserve fund sitting on its floor, a special assessment
// that won't cover the work it's for, a big operating budget still in draft
// with the AGM weeks away. Everything is derived fresh on each load - no
// stored "alert" rows, so an alert clears itself the moment the figures move.

export type BoardAlertLevel = "critical" | "warning" | "info"

export interface BoardFinancialAlert {
  id: string
  level: BoardAlertLevel
  title: string
  detail: string
  href: string
}

const levelRank: Record<BoardAlertLevel, number> = { critical: 0, warning: 1, info: 2 }

export const boardAlertLevelLabel: Record<BoardAlertLevel, string> = {
  critical: "Critical",
  warning: "Attention",
  info: "Review",
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

// Reserve-policy figures are all in USD. Restate a USD figure in whatever
// currency the org keeps its books in, so a comparison against an operating
// budget / assessment total is apples-to-apples.
function usdToBase(usd: number, base: Currency, rate: number | null | undefined): number {
  if (base === "USD") return usd
  return usd * (rate && Number.isFinite(rate) && rate > 0 ? rate : 17.5)
}

export async function getBoardFinancialAlerts(
  orgId: string,
  portalBase = "/dashboard/board"
): Promise<BoardFinancialAlert[]> {
  const now = new Date()
  const thisYear = now.getFullYear()

  const [org, reserveTxns, capitalItems, operatingBudgets, specialAssessments, openTickets, agm] =
    await Promise.all([
      db.organization.findUnique({ where: { id: orgId } }),
      db.reserveTransaction.findMany({ where: { orgId }, orderBy: { date: "asc" } }),
      db.reserveCapitalItem.findMany({ where: { orgId } }),
      db.budget.findMany({
        where: { orgId, type: "OPERATING" },
        include: { lineItems: true },
        orderBy: { year: "desc" },
      }),
      db.assessment.findMany({
        where: { orgId, type: "SPECIAL" },
        include: { charges: true },
      }),
      db.troubleTicket.findMany({
        where: { orgId, status: "ACTIVE" },
        include: { assignments: true, comments: true },
      }),
      db.keyDate.findUnique({ where: { orgId_type: { orgId, type: "AGM" } } }).catch(() => null),
    ])

  if (!org) return []

  const alerts: BoardFinancialAlert[] = []
  const base = org.baseCurrency
  const rate = org.currentExchangeRate
  const policy = resolveReservePolicy(org)
  const agmDays = agm ? daysBetween(agm.date, now) : null
  const agmSoon = agmDays !== null && agmDays >= 0 && agmDays <= 120
  const agmPhrase =
    agmDays === null
      ? ""
      : agmDays === 0
        ? " The AGM is today."
        : agmDays > 0
          ? ` The AGM is ${agmDays} day${agmDays !== 1 ? "s" : ""} away.`
          : ""

  // ---------------------------------------------------------------
  // Reserve fund position
  // ---------------------------------------------------------------
  const reserveBalance = reserveTxns.reduce(
    (s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount),
    0
  )
  const reserveHref = `${portalBase}/finances/reserve`
  const bal$ = formatMoney(reserveBalance, "USD")
  const floor$ = formatMoney(policy.floor, "USD")
  const target$ = formatMoney(policy.target, "USD")

  if (reserveBalance <= policy.floor) {
    alerts.push({
      id: "reserve-at-floor",
      level: "critical",
      title: "Reserve fund is at its minimum floor",
      detail:
        `Balance ${bal$} sits on the ${policy.floorPct}% floor (${floor$}) — ${policy.coveragePct}% of the ` +
        `${target$} target. The policy calls for a special assessment if it drops any further, and it has ` +
        `no headroom to absorb an unplanned repair.`,
      href: reserveHref,
    })
  } else if (reserveBalance <= policy.floor * 1.2) {
    alerts.push({
      id: "reserve-near-floor",
      level: "warning",
      title: "Reserve fund is close to its minimum floor",
      detail:
        `Balance ${bal$} is within 20% of the ${policy.floorPct}% floor (${floor$}). Coverage is ` +
        `${policy.coveragePct}% of the ${target$} target.`,
      href: reserveHref,
    })
  } else if (policy.coveragePct < 50) {
    alerts.push({
      id: "reserve-below-half",
      level: "info",
      title: "Reserve fund below half its target",
      detail: `Balance ${bal$} is ${policy.coveragePct}% of the ${target$} target.`,
      href: reserveHref,
    })
  }

  // No contribution recorded in the current year, when earlier years had them.
  const hadPriorDeposits = reserveTxns.some(
    (t) => t.type === "DEPOSIT" && t.date.getFullYear() < thisYear
  )
  const anyActivityThisYear = reserveTxns.some((t) => t.date.getFullYear() === thisYear)
  if (hadPriorDeposits && !anyActivityThisYear) {
    const lastYear = Math.max(...reserveTxns.map((t) => t.date.getFullYear()))
    alerts.push({
      id: "reserve-no-contribution-this-year",
      level: "warning",
      title: `No reserve contribution recorded for ${thisYear}`,
      detail:
        `The last reserve movement was in ${lastYear}. If owners contribute to the reserve annually, ` +
        `${thisYear}'s deposit is missing; if none is due this year, no action is needed.`,
      href: reserveHref,
    })
  }

  // ---------------------------------------------------------------
  // Reserve policy not yet adopted / no reserve study
  // ---------------------------------------------------------------
  const statusText = (org.reservePolicyStatus ?? "").toLowerCase()
  const policyUnadopted =
    !org.reservePolicyStatus || /draft|circulation|pending|proposed/.test(statusText)
  if (policyUnadopted) {
    const studyClause =
      capitalItems.length === 0
        ? ` There is no reserve study on file, so the ${target$} target and the roof estimate have no costed basis.`
        : ""
    alerts.push({
      id: "reserve-policy-unadopted",
      level: agmSoon ? "warning" : "info",
      title: "Reserve fund policy is not yet adopted",
      detail:
        `Revision ${policy.revision} is still a ${org.reservePolicyStatus ?? "draft"} — the target, the ` +
        `${policy.floorPct}% floor and the annual top-up are all placeholders pending an owner motion.` +
        studyClause +
        agmPhrase,
      href: reserveHref,
    })
  } else if (capitalItems.length === 0) {
    alerts.push({
      id: "reserve-no-study",
      level: "info",
      title: "No reserve study on file",
      detail:
        `The reserve fund has no costed component schedule, so the ${target$} target has no documented ` +
        `basis and upcoming replacements aren't tracked against it.`,
      href: reserveHref,
    })
  }

  // ---------------------------------------------------------------
  // Special assessment adequacy (roof and other capital projects)
  // ---------------------------------------------------------------
  const roofAssessments = specialAssessments.filter((a) => /roof/i.test(a.title))
  const roofNeedBase = usdToBase(policy.roofDrawdown, base, rate)
  if (policy.roofDrawdown > 0) {
    if (roofAssessments.length === 0) {
      alerts.push({
        id: "roof-no-assessment",
        level: "warning",
        title: `No funding in place for the ${policy.roofYear} roof`,
        detail:
          `The policy earmarks ${formatMoney(policy.roofDrawdown, "USD")} for the ${policy.roofYear} roof, ` +
          `funded by special assessment rather than the reserve, but no roof assessment has been raised.`,
        href: `${portalBase}/finances/assessments`,
      })
    } else {
      const plannedBase = roofAssessments.reduce((s, a) => s + a.totalAmount, 0)
      const draftCount = roofAssessments.filter((a) => a.status === "DRAFT").length
      const coverage = roofNeedBase > 0 ? plannedBase / roofNeedBase : 1
      const need$ = formatMoney(roofNeedBase, base)
      const planned$ = formatMoney(plannedBase, base)
      const draftClause =
        draftCount === roofAssessments.length
          ? ` Still ${roofAssessments.length === 1 ? "a draft" : "in draft"} — nothing is billed yet.`
          : draftCount > 0
            ? ` ${draftCount} of ${roofAssessments.length} still in draft.`
            : ""
      if (coverage < 0.9) {
        const gapPct = Math.round((1 - coverage) * 100)
        alerts.push({
          id: "roof-assessment-short",
          level: coverage < 0.6 ? "critical" : "warning",
          title: "Roof special assessment may not cover the work",
          detail:
            `${planned$} raised across ${roofAssessments.length} assessment${roofAssessments.length !== 1 ? "s" : ""} ` +
            `versus an estimated ${need$} roof cost — a ${gapPct}% shortfall.${draftClause}`,
          href: `${portalBase}/finances/assessments`,
        })
      } else if (draftCount === roofAssessments.length) {
        alerts.push({
          id: "roof-assessment-draft",
          level: "info",
          title: `Roof special assessment still in draft`,
          detail:
            `${planned$} planned for the ${policy.roofYear} roof, but the assessment${roofAssessments.length !== 1 ? "s are" : " is"} ` +
            `still a draft and nothing is billed yet.${agmPhrase}`,
          href: `${portalBase}/finances/assessments`,
        })
      }
    }
  }

  // ---------------------------------------------------------------
  // Unassigned high-urgency maintenance tickets
  // ---------------------------------------------------------------
  const stale = openTickets.filter((t) => {
    if (t.assignments.length > 0) return false
    const age = daysBetween(now, t.createdAt)
    if (t.priority === "EMERGENCY") return age >= 1
    if (t.priority === "URGENT") return age >= 2
    if (t.priority === "HIGH") return age >= 7
    return false
  })
  if (stale.length > 0) {
    const worst = [...stale].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
    const worstAge = daysBetween(now, worst.createdAt)
    alerts.push({
      id: "tickets-unassigned-urgent",
      level: stale.some((t) => t.priority === "EMERGENCY" || t.priority === "URGENT")
        ? "critical"
        : "warning",
      title:
        stale.length === 1
          ? "An urgent maintenance ticket is unassigned"
          : `${stale.length} urgent maintenance tickets are unassigned`,
      detail:
        `"${worst.title}" (${worst.priority.toLowerCase()}) has been open ${worstAge} day${worstAge !== 1 ? "s" : ""} ` +
        `with no contractor assigned and no updates.` +
        (stale.length > 1 ? ` ${stale.length - 1} other${stale.length - 1 !== 1 ? "s" : ""} also waiting.` : ""),
      href: `${portalBase}/tickets`,
    })
  }

  // ---------------------------------------------------------------
  // Operating budget: large draft, no approved baseline, light reserve line
  // ---------------------------------------------------------------
  const approvedOperating = operatingBudgets.filter((b) => b.status === "APPROVED")
  const latestPopulatedDraft = operatingBudgets.find(
    (b) => b.status === "DRAFT" && b.lineItems.length > 0
  )
  if (latestPopulatedDraft) {
    const b = latestPopulatedDraft
    const budgetCur = b.currency
    const total = b.lineItems.reduce((s, i) => s + i.budgetedAmount, 0)
    const total$ = formatMoney(total, budgetCur)
    const clauses: string[] = []
    clauses.push(
      `The ${b.year} operating budget (${total$}${budgetCur !== "USD" ? ` ${budgetCur}` : ""}) is still a draft` +
        (b.version ? ` (${b.version.toLowerCase()})` : "") +
        ` and hasn't been approved.`
    )
    if (approvedOperating.length === 0) {
      clauses.push(
        `No prior operating budget has been approved in HOPE, so this can't be compared year over year yet.`
      )
    }
    // Reserve-contribution line vs the policy's required top-up.
    const reserveLine = b.lineItems.find((i) => i.category === "RESERVE_CONTRIBUTION")
    const neededInBudgetCur = usdToBase(
      policy.budgetLineUsd,
      budgetCur,
      budgetCur === "MXN" ? (b.exchangeRate ?? policy.exchangeRate) : rate
    )
    if (reserveLine && neededInBudgetCur > 0 && reserveLine.budgetedAmount < neededInBudgetCur * 0.9) {
      clauses.push(
        `Its reserve contribution line (${formatMoney(reserveLine.budgetedAmount, budgetCur)}) is below the ` +
          `${formatMoney(neededInBudgetCur, budgetCur)} the reserve policy's top-up plan calls for.`
      )
    } else if (!reserveLine) {
      clauses.push(`It has no reserve contribution line.`)
    }
    alerts.push({
      id: "operating-budget-draft",
      level: agmSoon ? "warning" : "info",
      title: `${b.year} operating budget needs Board sign-off`,
      detail: clauses.join(" ") + (agmSoon ? agmPhrase : ""),
      href: `${portalBase}/finances/${b.id}`,
    })
  }

  return alerts.sort((a, b) => levelRank[a.level] - levelRank[b.level])
}
