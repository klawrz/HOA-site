import { db } from "@/lib/db"
import type { AgmTrackKind, Role } from "@/generated/prisma"
import type { AgendaSeed, FullAgm, AgmUnitInput, AgmUnitRow, AgmTally } from "@/lib/agm-shared"
import {
  PROXY_CAP_FRACTION,
  AGM_BANNER_WINDOW_DAYS,
  convocatoriaFullText,
  coverEmailText,
  agmMeetingDateStrings,
  proxyLetterText,
} from "@/lib/agm-shared"
import { getUnitLabel, unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"
import { getEffectiveOperatingBudget } from "@/lib/dues-schedule"

// AGM domain helpers - data loading, the default bilingual agendas taken
// from the 2025 informative package, and the live quorum / proxy-cap tally
// the Board console runs. Rules come from the 2013 Regime (see the
// hope_agm_process memory): 14 Villas = 100%, each votes its
// Unit.allocationPercent share, >=50% weight for a first-call quorum, and
// no more than 35% of owners may be represented by proxy.
//
// Constants and pure types live in "@/lib/agm-shared" (client-safe) and
// are re-exported here for existing server callers.
export {
  AGM_TRACK_LABEL,
  PROXY_CAP_FRACTION,
  type AgendaSeed,
  type FullAgm,
  type AgmTrackWithItems,
  type AgmUnitInput,
  type AgmUnitRow,
  type AgmTally,
} from "@/lib/agm-shared"

// Default bilingual agendas + proxy letter text (from the 2025
// convocatorias / proxy templates) live in agm-shared so both the server
// actions and any client code can use them.
export {
  regimeAgendaSeed,
  civilAssociationAgendaSeed,
  agendaSeedFor,
  proxyLetterText,
  convocatoriaText,
  convocatoriaFullText,
  agmMeetingDateStrings,
  coverEmailText,
  type ProxyLetterFields,
  type ConvocatoriaFields,
  type CoverEmailFields,
} from "@/lib/agm-shared"

export async function loadAgm(orgId: string, year: number): Promise<FullAgm | null> {
  return db.agm.findUnique({
    where: { orgId_year: { orgId, year } },
    include: {
      tracks: { include: { items: { orderBy: { order: "asc" } } }, orderBy: { kind: "asc" } },
      participation: true,
    },
  })
}

// The most relevant AGM to show by default: the nearest upcoming one, else
// the most recent past one.
export async function loadCurrentAgm(orgId: string): Promise<FullAgm | null> {
  const now = new Date()
  const upcoming = await db.agm.findFirst({
    where: { orgId, date: { gte: now } },
    orderBy: { date: "asc" },
    include: {
      tracks: { include: { items: { orderBy: { order: "asc" } } }, orderBy: { kind: "asc" } },
      participation: true,
    },
  })
  if (upcoming) return upcoming
  return db.agm.findFirst({
    where: { orgId },
    orderBy: { date: "desc" },
    include: {
      tracks: { include: { items: { orderBy: { order: "asc" } } }, orderBy: { kind: "asc" } },
      participation: true,
    },
  })
}

// duesCurrentUnitIds: units with no outstanding dues/assessment balance -
// used only as the fallback when a unit's eligibility has not been reviewed
// on the console yet (AgmParticipation.eligibleToVote is null).
export function computeAgmTally(
  agm: FullAgm,
  units: AgmUnitInput[],
  duesCurrentUnitIds: Set<string>
): AgmTally {
  const totalUnits = units.length
  const byUnit = new Map(agm.participation.map((p) => [p.unitId, p]))

  const rows: AgmUnitRow[] = units.map((u) => {
    const p = byUnit.get(u.id)
    const reviewed = p?.eligibleToVote != null
    const eligible = reviewed ? Boolean(p!.eligibleToVote) : duesCurrentUnitIds.has(u.id)
    const proxyComplete = Boolean(p?.proxyRegimeDocUrl && p?.proxyCivilDocUrl && p?.proxyIdDocUrl)
    return {
      unitId: u.id,
      participationId: p?.id ?? null,
      label: u.label,
      status: p?.status ?? "NO_RESPONSE",
      eligible,
      eligibilitySource: reviewed ? "reviewed" : "dues-suggested",
      proxyHolderName: p?.proxyHolderName ?? null,
      proxyHolderType: p?.proxyHolderType ?? null,
      proxyComplete,
      proxyVerified: Boolean(p?.proxyVerifiedOn),
    }
  })

  // One villa = one vote. Quorum is a headcount of villas present.
  const isPresent = (s: AgmUnitRow["status"]) => s === "ATTENDING_IN_PERSON" || s === "BY_PROXY"

  const responded = rows.filter((r) => r.status !== "NO_RESPONSE").length
  const inPerson = rows.filter((r) => r.status === "ATTENDING_IN_PERSON").length
  const byProxy = rows.filter((r) => r.status === "BY_PROXY").length
  const notAttending = rows.filter((r) => r.status === "NOT_ATTENDING").length
  const eligibleAttendingCount = rows.filter((r) => isPresent(r.status) && r.eligible).length
  const rawAttendingCount = rows.filter((r) => isPresent(r.status)).length
  const proxyCount = byProxy
  const proxyCap = Math.floor(PROXY_CAP_FRACTION * totalUnits)
  const proxiesAwaitingVerification = rows.filter((r) => r.status === "BY_PROXY" && !r.proxyVerified).length
  const ineligibleUnits = rows.filter((r) => !r.eligible).length

  return {
    totalUnits,
    responded,
    outstanding: totalUnits - responded,
    inPerson,
    byProxy,
    notAttending,
    eligibleAttendingCount,
    rawAttendingCount,
    proxyCount,
    proxyCap,
    proxyOverCap: proxyCount > proxyCap,
    proxiesAwaitingVerification,
    ineligibleUnits,
    perTrack: agm.tracks.map((t) => {
      const quorumCount = Math.ceil((t.firstCallQuorumPct / 100) * totalUnits)
      return {
        kind: t.kind,
        quorumPct: t.firstCallQuorumPct,
        quorumCount,
        firstCallMet: eligibleAttendingCount >= quorumCount,
      }
    }),
    rows,
  }
}

// Units with no outstanding balance across ISSUED assessments - the
// dues-current signal for the eligibility fallback.
export async function getDuesCurrentUnitIds(orgId: string): Promise<Set<string>> {
  const charges = await db.assessmentCharge.findMany({
    where: { assessment: { orgId, status: "ISSUED" } },
    select: { unitId: true, amountDue: true, amountPaid: true },
  })
  const owing = new Set<string>()
  for (const c of charges) {
    if (c.amountPaid + 1e-6 < c.amountDue) owing.add(c.unitId)
  }
  const allUnits = await db.unit.findMany({ where: { orgId }, select: { id: true } })
  return new Set(allUnits.map((u) => u.id).filter((id) => !owing.has(id)))
}

// Everything the Board / PM AGM console page needs - loaded once so the
// role-scoped route files (board/agm, property-manager/agm) stay thin.
export async function getAgmConsoleData(orgId: string) {
  const [agm, units, unitLabel, duesCurrent] = await Promise.all([
    loadCurrentAgm(orgId),
    db.unit.findMany({
      where: { orgId },
      include: { ownerships: { where: { isCurrent: true }, include: { owner: true } } },
    }),
    getUnitLabel(orgId),
    getDuesCurrentUnitIds(orgId),
  ])
  units.sort(compareUnitNumbers)

  const unitInputs: AgmUnitInput[] = units.map((u) => ({
    id: u.id,
    label: unitDisplayName(unitLabel, u.number),
  }))
  const ownerByUnit: Record<string, string> = {}
  for (const u of units) {
    const o = u.ownerships[0]?.owner
    if (o) ownerByUnit[u.id] = o.name ?? o.email ?? "Owner"
  }

  const now = new Date()
  const nextYear = now.getMonth() >= 11 ? now.getFullYear() + 1 : now.getFullYear()
  const tally = agm ? computeAgmTally(agm, unitInputs, duesCurrent) : null

  return { agm, ownerByUnit, tally, nextYear }
}

export type AgmBannerInfo = {
  year: number
  dateISO: string
  daysUntil: number
  href: string | null // null = informational only (renter / contractor / unit manager)
  cta: string | null
  secondaryHref: string | null
  secondaryCta: string | null
  needsAction: boolean // owner still owes an RSVP, or Board/PM notice not issued
}

// Lightweight lookup for the dashboard-wide "AGM is coming" banner. Runs on
// every dashboard page, so it stays to one indexed findFirst plus at most
// one small count. Returns null unless an AGM falls inside the window.
export async function getAgmBannerInfo(
  orgId: string | null | undefined,
  userId: string,
  role: Role,
  isBoardMember: boolean
): Promise<AgmBannerInfo | null> {
  if (!orgId) return null
  const now = new Date()
  const windowEnd = new Date(now.getTime() + AGM_BANNER_WINDOW_DAYS * 86_400_000)

  const agm = await db.agm.findFirst({
    where: { orgId, date: { gte: now, lte: windowEnd }, status: { not: "COMPLETED" } },
    orderBy: { date: "asc" },
    select: { id: true, year: true, date: true, noticeIssuedOn: true },
  })
  if (!agm) return null

  const daysUntil = Math.ceil((agm.date.getTime() - now.getTime()) / 86_400_000)

  // Board / PM: run the meeting. An Owner who also sits on the Board is
  // sent to the Board view (more to do there).
  if (role === "BOARD_MEMBER" || isBoardMember) {
    return {
      year: agm.year,
      dateISO: agm.date.toISOString(),
      daysUntil,
      href: "/dashboard/board/agm",
      cta: "Prepare the meeting",
      secondaryHref: "/dashboard/board/agm/documents/packet",
      secondaryCta: "Package",
      needsAction: !agm.noticeIssuedOn,
    }
  }
  if (role === "PROPERTY_MANAGER") {
    return {
      year: agm.year,
      dateISO: agm.date.toISOString(),
      daysUntil,
      href: "/dashboard/property-manager/agm",
      cta: "Run the AGM",
      secondaryHref: null,
      secondaryCta: null,
      needsAction: !agm.noticeIssuedOn,
    }
  }

  // Owners: confirm attendance / appoint a proxy for each villa they hold.
  if (role === "OWNER" || role === "ACCOUNT_OWNER") {
    const villas = await db.unitOwnership.findMany({
      where: { ownerId: userId, isCurrent: true, unit: { orgId } },
      select: { unitId: true },
    })
    let needsAction = false
    if (villas.length > 0) {
      const responded = await db.agmParticipation.count({
        where: {
          agmId: agm.id,
          unitId: { in: villas.map((v) => v.unitId) },
          status: { not: "NO_RESPONSE" },
        },
      })
      needsAction = responded < villas.length
    }
    return {
      year: agm.year,
      dateISO: agm.date.toISOString(),
      daysUntil,
      href: "/dashboard/owner/governance/agm",
      cta: needsAction ? "Confirm your attendance" : "View the AGM",
      secondaryHref: villas.length > 0 ? "/dashboard/owner/governance/agm/packet" : null,
      secondaryCta: villas.length > 0 ? "Get your package" : null,
      needsAction,
    }
  }

  // Renter / Contractor / Unit Manager: informational only - no vote, no
  // dedicated AGM page.
  return {
    year: agm.year,
    dateISO: agm.date.toISOString(),
    daysUntil,
    href: null,
    cta: null,
    secondaryHref: null,
    secondaryCta: null,
    needsAction: false,
  }
}

// Everything the AGM document pages need, computed once - the combined
// packet and the individual convocatoria / dues routes all read from this
// so the generated docs stay identical. Returns null when no AGM exists.
export async function getAgmPacketData(orgId: string) {
  const [agm, budget, units, unitLabel] = await Promise.all([
    loadCurrentAgm(orgId),
    getEffectiveOperatingBudget(orgId),
    db.unit.findMany({ where: { orgId }, select: { number: true, allocationPercent: true } }),
    getUnitLabel(orgId),
  ])
  if (!agm) return null
  units.sort(compareUnitNumbers)

  const md = agmMeetingDateStrings(agm.date)
  const noticeDateLabel = (agm.noticeIssuedOn ?? new Date()).toLocaleDateString("en-CA", {
    timeZone: "UTC",
  })
  const signatories = (agm.signatoryNames || agm.chairpersonName || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  const tracks = agm.tracks.map((t) => {
    const gen = convocatoriaFullText(t.kind, {
      meetingDateEs: md.es,
      meetingDateEn: md.en,
      callTimes: agm.callTimes,
      location: agm.location,
      quorumPct: t.firstCallQuorumPct,
    })
    return {
      kind: t.kind,
      bodyEs: t.callBodyEs || gen.es,
      bodyEn: t.callBodyEn || gen.en,
      items: t.items.map((i) => ({
        id: i.id,
        numeral: i.numeral,
        titleEs: i.titleEs,
        titleEn: i.titleEn,
        isExtraordinary: i.isExtraordinary,
      })),
    }
  })

  const email = coverEmailText({
    year: agm.year,
    meetingDateEs: md.es,
    meetingDateEn: md.en,
    callTimes: agm.callTimes,
    location: agm.location,
    proxyContactName: agm.proxyContactName || "[nombre del contacto / contact name]",
    proxyContactEmail: agm.proxyContactEmail || "[correo / email]",
  })

  const fyLabel = agm.year + 1
  const currency = budget?.currency ?? "USD"
  const total = budget?.totalNative ?? 0
  const totalFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(total)
  const duesRows = units.map((u) => {
    const pct = u.allocationPercent ?? (units.length ? 100 / units.length : 0)
    const annual = (pct / 100) * total
    return { label: unitDisplayName(unitLabel, u.number), pct, annual, q: annual / 4 }
  })

  return {
    agm: {
      id: agm.id,
      year: agm.year,
      dateISO: agm.date.toISOString(),
      location: agm.location,
      callTimes: agm.callTimes,
      chairpersonName: agm.chairpersonName,
      zoomInfo: agm.zoomInfo,
    },
    noticeDateLabel,
    signatories,
    tracks,
    email,
    dues: {
      fyLabel,
      unitLabel,
      currency,
      totalFormatted,
      rows: duesRows,
      totalPct: duesRows.reduce((s, r) => s + r.pct, 0),
      totalAnnual: duesRows.reduce((s, r) => s + r.annual, 0),
      sourceNote: budget
        ? `From the ${budget.isProposed ? "proposed" : "approved"} ${budget.year} operating budget (${budget.version}).`
        : "No operating budget on file yet.",
    },
  }
}

// An owner's pre-filled proxy letters (Regime + Civil Association) for each
// villa they currently own - or just one when unitId is given. Board / PM
// (privileged) may fetch for any villa.
export async function getOwnerProxyLetters(
  orgId: string,
  userId: string,
  opts: { unitId?: string; privileged?: boolean } = {}
) {
  const agm = await loadCurrentAgm(orgId)
  if (!agm) return null
  const md = agmMeetingDateStrings(agm.date)

  // `privileged` only widens scope when a specific villa is named (so
  // Board/PM can pull one villa's letters). With no unitId, everyone -
  // privileged or not - gets only the villas they themselves own.
  const restrictToOwn = !(opts.privileged && opts.unitId)
  const units = await db.unit.findMany({
    where: {
      orgId,
      ...(opts.unitId ? { id: opts.unitId } : {}),
      ...(restrictToOwn
        ? { ownerships: { some: { isCurrent: true, ownerId: userId } } }
        : {}),
    },
    include: { ownerships: { where: { isCurrent: true }, include: { owner: true } } },
  })
  units.sort(compareUnitNumbers)
  if (units.length === 0) return null

  const unitLabel = await getUnitLabel(orgId)

  return {
    agmYear: agm.year,
    villas: units.map((u) => {
      const granterNames =
        u.ownerships.map((o) => o.owner.name ?? o.owner.email).filter(Boolean).join(" y ") || ""
      const label = unitDisplayName(unitLabel, u.number)
      const fields = {
        granterNames,
        unitLabel: label,
        meetingDateEs: md.es,
        meetingDateEn: md.en,
      }
      return {
        label,
        granterNames,
        letters: (["REGIME", "CIVIL_ASSOCIATION"] as AgmTrackKind[]).map((k) =>
          proxyLetterText(k, fields)
        ),
      }
    }),
  }
}
