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
export type AgmChecklistItem = { key: string; label: string; done: boolean }

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

  // A quick "is everything ready" readiness strip for the Board/PM console -
  // ten-ish prep steps at a glance rather than having to hunt through the
  // page for each one.
  let checklist: AgmChecklistItem[] = []
  if (agm) {
    const [budget, prevAgm] = await Promise.all([
      db.budget.findFirst({
        where: { orgId, year: agm.year + 1, type: "OPERATING" },
        select: { id: true },
      }),
      db.agm.findUnique({
        where: { orgId_year: { orgId, year: agm.year - 1 } },
        select: { minutesFiledOn: true },
      }),
    ])
    checklist = [
      { key: "date-location", label: "Date & location", done: !!agm.location },
      {
        key: "call-documents",
        label: "Call documents",
        done: agm.tracks.every((t) => !!t.callBodyEs && !!t.callBodyEn),
      },
      { key: "agendas", label: "Agendas", done: agm.tracks.every((t) => t.items.length > 0) },
      { key: "chairperson", label: "Chairperson", done: !!agm.chairpersonName },
      { key: "budget", label: "Budget", done: !!budget },
      {
        key: "previous-minutes",
        label: "Previous minutes",
        done: prevAgm ? !!prevAgm.minutesFiledOn : true,
      },
      { key: "package-issuance", label: "Package issuance", done: !!agm.noticeIssuedOn },
      {
        key: "proxies",
        label: "Proxies",
        done: !!agm.proxyContactName && !!agm.proxyContactEmail,
      },
    ]
  }

  // The package preparer's document manifest + what's available to add to
  // it (org documents not already in the inventory).
  let documentItems: Awaited<ReturnType<typeof loadAgmDocumentItems>> = []
  let availableDocuments: { id: string; title: string; category: string }[] = []
  if (agm) {
    documentItems = await loadAgmDocumentItems(agm.id)
    const usedDocumentIds = documentItems.filter((i) => i.documentId).map((i) => i.documentId as string)
    availableDocuments = await db.document.findMany({
      where: { orgId, id: { notIn: usedDocumentIds } },
      select: { id: true, title: true, category: true },
      orderBy: { createdAt: "desc" },
    })
  }

  return { agm, ownerByUnit, tally, nextYear, checklist, documentItems, availableDocuments }
}

export function loadAgmDocumentItems(agmId: string) {
  return db.agmDocumentItem.findMany({
    where: { agmId },
    include: { document: { select: { id: true, title: true, fileUrl: true } } },
    orderBy: { number: "asc" },
  })
}

// Where each generated manifest item actually lives - these are computed
// live (never a persisted Document row, see addAgmDocumentItem), so the
// Document Library can only link out to the page that renders them, not a
// file. Board-only routes: only shown to a Board/PM viewer, or an owner who
// is also a Board Member (same three-way check those pages use themselves).
const GENERATED_DOC_HREF: Record<string, string> = {
  "at-a-glance": "/dashboard/board/agm/documents/summary",
  "cover-letter": "/dashboard/board/agm/documents/cover-email",
  "convocatoria-regime": "/dashboard/board/agm/documents/convocatoria?track=REGIME",
  "convocatoria-civil": "/dashboard/board/agm/documents/convocatoria?track=CIVIL_ASSOCIATION",
  dues: "/dashboard/board/agm/documents/dues",
}

export type AgmLibraryDocumentItem = {
  id: string
  number: number
  title: string
  revision: string
  source: "GENERATED" | "UPLOADED"
  notes: string | null
  href: string | null
}

// The AGM package's document manifest, shaped for the general Document
// Library pages (Board/PM/Owner) rather than the AGM console - the
// generated items (cover letter, both convocatorias, dues schedule,
// at-a-glance summary) never get a Document row of their own, so without
// this they simply never showed up as "documents" anywhere outside the AGM
// console's own manifest table.
export async function getAgmDocumentInventoryForLibrary(
  orgId: string
): Promise<{ agmYear: number; items: AgmLibraryDocumentItem[] } | null> {
  const agm = await loadCurrentAgm(orgId)
  if (!agm) return null
  const items = await loadAgmDocumentItems(agm.id)
  if (items.length === 0) return null

  return {
    agmYear: agm.year,
    items: items.map((i) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      revision: i.revision,
      source: i.source,
      notes: i.notes,
      href:
        i.source === "GENERATED"
          ? (GENERATED_DOC_HREF[i.generatedKey ?? ""] ?? null)
          : (i.document?.fileUrl ?? null),
    })),
  }
}

// One of the package links shown in the banner. `setPreference` is only
// set for a real unit owner's own package link - clicking it updates their
// villa(s)' default before opening the document, so the choice sticks.
export type AgmBannerPackageLink = {
  href: string
  cta: string
  setPreference?: "SUMMARY" | "FULL"
}

export type AgmBannerInfo = {
  year: number
  dateISO: string
  daysUntil: number
  href: string | null // null = informational only (renter / contractor / unit manager)
  cta: string | null
  packageLinks: AgmBannerPackageLink[]
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
      packageLinks: [
        { href: "/dashboard/board/agm/documents/summary", cta: "Summary package" },
        { href: "/dashboard/board/agm/documents/packet", cta: "Detailed package" },
      ],
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
      packageLinks: [],
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
    // Same URL for both - the packet route reads the villa's own
    // preference, which each link sets right before opening it.
    const packetHref = "/dashboard/owner/governance/agm/packet"
    return {
      year: agm.year,
      dateISO: agm.date.toISOString(),
      daysUntil,
      href: "/dashboard/owner/governance/agm",
      cta: needsAction ? "Confirm your attendance" : "View the AGM",
      packageLinks:
        villas.length > 0
          ? [
              { href: packetHref, cta: "Summary package", setPreference: "SUMMARY" as const },
              { href: packetHref, cta: "Detailed package", setPreference: "FULL" as const },
            ]
          : [],
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
    packageLinks: [],
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

  const inventoryItems = await db.agmDocumentItem.findMany({
    where: { agmId: agm.id },
    include: { document: true },
    orderBy: { number: "asc" },
  })
  const byKey: Record<
    string,
    { number: number; revision: string; includeInDetailed: boolean; includeInSummary: boolean }
  > = {}
  const attachmentsDetailed: { number: number; title: string; revision: string; fileUrl: string | null }[] = []
  const attachmentsSummary: { number: number; title: string; revision: string; fileUrl: string | null }[] = []
  for (const item of inventoryItems) {
    if (item.source === "GENERATED" && item.generatedKey) {
      byKey[item.generatedKey] = {
        number: item.number,
        revision: item.revision,
        includeInDetailed: item.includeInDetailed,
        includeInSummary: item.includeInSummary,
      }
    } else {
      const row = { number: item.number, title: item.title, revision: item.revision, fileUrl: item.document?.fileUrl ?? null }
      if (item.includeInDetailed) attachmentsDetailed.push(row)
      if (item.includeInSummary) attachmentsSummary.push(row)
    }
  }
  // A brand-new AGM (created before this feature, or never opened its
  // package manager) has no inventory rows yet - default every generated
  // section to included so nothing silently disappears from the package.
  const sectionIncluded = (key: string, pkg: "detailed" | "summary") => {
    const row = byKey[key]
    if (!row) return true
    return pkg === "detailed" ? row.includeInDetailed : row.includeInSummary
  }
  const sectionTag = (key: string) => (byKey[key] ? `#${byKey[key].number} · Rev ${byKey[key].revision}` : null)

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
        kind: i.kind,
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
      proxyDeadlineISO: agm.proxyDeadline ? agm.proxyDeadline.toISOString() : null,
      rsvpDeadlineISO: agm.rsvpDeadline ? agm.rsvpDeadline.toISOString() : null,
      proxyContactName: agm.proxyContactName,
      proxyContactEmail: agm.proxyContactEmail,
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
    inventory: {
      sectionIncluded,
      sectionTag,
      attachmentsDetailed,
      attachmentsSummary,
    },
  }
}

// An owner's pre-filled proxy letters (Regime + Civil Association) for each
// villa they currently own - or just one when unitId is given. Board / PM
// (privileged) may fetch for any villa. `userId` is only needed to resolve
// "the villas this person owns" - omit it (with unitId + privileged) for a
// unit-scoped lookup with no signed-in user at all, e.g. a no-login magic link.
export async function getOwnerProxyLetters(
  orgId: string,
  userId: string | undefined,
  opts: { unitId?: string; privileged?: boolean } = {}
) {
  const agm = await loadCurrentAgm(orgId)
  if (!agm) return null
  const md = agmMeetingDateStrings(agm.date)

  // `privileged` only widens scope when a specific villa is named (so
  // Board/PM can pull one villa's letters). With no unitId, everyone -
  // privileged or not - gets only the villas they themselves own.
  const restrictToOwn = !(opts.privileged && opts.unitId)
  if (restrictToOwn && !userId) return null
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

// ------------------------------------------------------------
// AgmPackageLink - no-login "send the call" magic links.
//
// The 2013 Regime requires the HOA to proactively issue the call notice to
// owners, not just leave it for them to find - so the Board needs a link
// per unit that opens straight to that unit's own personalized package
// (their preferred summary/detailed doc + their pre-filled proxy letters)
// with zero sign-in friction, the same "unguessable token is the
// credential" shape as OccupancyShareLink's "Share with a contact".
// ------------------------------------------------------------

// The Board/PM roster of who has (and hasn't) opened their call - unit,
// owner names, the link itself, sent/opened timestamps.
export async function getAgmCallRoster(orgId: string) {
  const agm = await loadCurrentAgm(orgId)
  if (!agm) return null

  const [links, allUnits, unitLabel] = await Promise.all([
    db.agmPackageLink.findMany({ where: { agmId: agm.id } }),
    db.unit.findMany({
      where: { orgId },
      include: { ownerships: { where: { isCurrent: true }, include: { owner: true } } },
    }),
    getUnitLabel(orgId),
  ])
  const linkByUnitId = new Map(links.map((l) => [l.unitId, l]))
  allUnits.sort(compareUnitNumbers)

  return {
    agmYear: agm.year,
    rows: allUnits.map((u) => {
      const link = linkByUnitId.get(u.id)
      const ownerNames =
        u.ownerships.map((o) => o.owner.name ?? o.owner.email).filter(Boolean).join(" y ") ||
        "No owner on file"
      return {
        unitId: u.id,
        label: unitDisplayName(unitLabel, u.number),
        ownerNames,
        token: link?.token ?? null,
        sentAt: link?.sentAt?.toISOString() ?? null,
        openedAt: link?.openedAt?.toISOString() ?? null,
      }
    }),
  }
}

// Public resolver for the no-login package page - the token alone is the
// credential, scoped to exactly one unit's own AGM package.
export async function resolveAgmPackageLink(token: string) {
  const link = await db.agmPackageLink.findUnique({
    where: { token },
    include: { unit: { select: { agmDocumentPreference: true, orgId: true } } },
  })
  if (!link) return null

  if (!link.openedAt) {
    await db.agmPackageLink.update({ where: { id: link.id }, data: { openedAt: new Date() } })
  }

  return {
    orgId: link.unit.orgId,
    unitId: link.unitId,
    wantsFull: link.unit.agmDocumentPreference === "FULL",
  }
}
