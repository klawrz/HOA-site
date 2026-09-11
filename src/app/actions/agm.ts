"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { saveUploadedFile } from "@/lib/file-upload"
import {
  agendaSeedFor,
  convocatoriaFullText,
  agmMeetingDateStrings,
} from "@/lib/agm-shared"
import type { AgmTrackKind, AgmParticipationStatus, AgmProxyHolderType, AgmDocumentPreference } from "@/generated/prisma"

type Result = { success: boolean; error?: string }

// Same "who files the paperwork" gate as key-dates.ts / meetings.ts -
// Board, an Owner sitting on the Board, the Account Owner, and the PM can
// all set up and run the AGM.
function canManageAgm(role: string | null, isBoardMember: boolean) {
  return (
    role === "BOARD_MEMBER" ||
    isBoardMember ||
    role === "ACCOUNT_OWNER" ||
    role === "PROPERTY_MANAGER"
  )
}

function revalidateAgmPaths() {
  for (const p of [
    "/dashboard/board/agm",
    "/dashboard/property-manager/agm",
    "/dashboard/owner/governance/agm",
    "/dashboard/board/key-info",
    "/dashboard/board",
    "/dashboard/owner/governance",
  ]) {
    revalidatePath(p)
  }
}

// Clicking "Summary package" / "Detailed package" from the AGM banner sets
// this as the default for every villa the viewer currently owns (not just
// one) - so their choice sticks the next time they hit "Get your package"
// from anywhere, not just this click.
export async function setViewerAgmDocumentPreference(preference: AgmDocumentPreference) {
  const session = await auth()
  if (!session?.user?.id || !session.user.orgId) return { success: false }
  if (preference !== "SUMMARY" && preference !== "FULL") {
    return { success: false, error: "Invalid preference" }
  }

  await db.unit.updateMany({
    where: {
      orgId: session.user.orgId,
      ownerships: { some: { isCurrent: true, ownerId: session.user.id } },
    },
    data: { agmDocumentPreference: preference },
  })

  revalidateAgmPaths()
  return { success: true }
}

function combineDateTime(date: string, time: string | null): Date | null {
  if (!date) return null
  const d = time ? new Date(`${date}T${time}`) : new Date(`${date}T00:00`)
  return isNaN(d.getTime()) ? null : d
}

function dateOnly(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

// Create the AGM for a year plus its two legal tracks (Regime + Civil
// Association), each seeded with the default bilingual agenda taken from
// the 2025 convocatorias. Idempotent - if the AGM already exists it just
// updates the shared details.
export async function ensureAgm(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const orgId = session.user.orgId

  const year = Number(formData.get("year"))
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { success: false, error: "Enter a valid year" }
  }
  const date = combineDateTime(
    (formData.get("date") as string) || "",
    (formData.get("time") as string) || null
  )
  if (!date) return { success: false, error: "A valid meeting date is required" }

  const shared = {
    date,
    location: (formData.get("location") as string) || null,
    callTimes: (formData.get("callTimes") as string) || null,
    chairpersonName: (formData.get("chairpersonName") as string) || null,
  }

  const existing = await db.agm.findUnique({ where: { orgId_year: { orgId, year } } })
  if (existing) {
    await db.agm.update({ where: { id: existing.id }, data: shared })
    revalidateAgmPaths()
    return { success: true }
  }

  const fy = year
  const md = agmMeetingDateStrings(date)
  await db.agm.create({
    data: {
      orgId,
      year,
      ...shared,
      createdById: session.user.id,
      tracks: {
        create: (["REGIME", "CIVIL_ASSOCIATION"] as AgmTrackKind[]).map((kind) => {
          // Pre-fill the editable convocatoria body with the generated
          // draft so the Board / PM start from a complete document.
          const full = convocatoriaFullText(kind, {
            meetingDateEs: md.es,
            meetingDateEn: md.en,
            callTimes: shared.callTimes,
            location: shared.location,
            quorumPct: 50,
          })
          return {
            kind,
            callBodyEs: full.es,
            callBodyEn: full.en,
            items: {
              create: agendaSeedFor(kind, fy).map((s, i) => ({
                order: i,
                numeral: s.numeral,
                kind: s.kind,
                titleEs: s.titleEs,
                titleEn: s.titleEn,
                isExtraordinary: s.isExtraordinary ?? false,
              })),
            },
          }
        }),
      },
    },
  })

  revalidateAgmPaths()
  return { success: true }
}

export async function updateAgmDetails(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const id = formData.get("agmId") as string
  const agm = await db.agm.findFirst({ where: { id, orgId: session.user.orgId } })
  if (!agm) return { success: false, error: "AGM not found" }

  const date = combineDateTime(
    (formData.get("date") as string) || "",
    (formData.get("time") as string) || null
  )
  if (!date) return { success: false, error: "A valid meeting date is required" }

  const statusRaw = (formData.get("status") as string) || agm.status
  const status = ["DRAFT", "NOTICE_ISSUED", "IN_PROGRESS", "COMPLETED"].includes(statusRaw)
    ? (statusRaw as typeof agm.status)
    : agm.status

  await db.agm.update({
    where: { id },
    data: {
      date,
      location: (formData.get("location") as string) || null,
      callTimes: (formData.get("callTimes") as string) || null,
      chairpersonName: (formData.get("chairpersonName") as string) || null,
      noticeIssuedOn: dateOnly((formData.get("noticeIssuedOn") as string) || null),
      proxyDeadline: dateOnly((formData.get("proxyDeadline") as string) || null),
      rsvpDeadline: dateOnly((formData.get("rsvpDeadline") as string) || null),
      minutesFiledOn: dateOnly((formData.get("minutesFiledOn") as string) || null),
      zoomInfo: (formData.get("zoomInfo") as string) || null,
      notes: (formData.get("notes") as string) || null,
      proxyContactName: (formData.get("proxyContactName") as string) || null,
      proxyContactEmail: (formData.get("proxyContactEmail") as string) || null,
      signatoryNames: (formData.get("signatoryNames") as string) || null,
      status,
    },
  })
  revalidateAgmPaths()
  return { success: true }
}

export async function updateAgmTrack(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const trackId = formData.get("trackId") as string
  const track = await db.agmTrack.findFirst({
    where: { id: trackId, agm: { orgId: session.user.orgId } },
  })
  if (!track) return { success: false, error: "Track not found" }

  const quorumRaw = Number(formData.get("firstCallQuorumPct"))
  await db.agmTrack.update({
    where: { id: trackId },
    data: {
      callBodyEs: (formData.get("callBodyEs") as string) || null,
      callBodyEn: (formData.get("callBodyEn") as string) || null,
      firstCallQuorumPct:
        Number.isFinite(quorumRaw) && quorumRaw > 0 && quorumRaw <= 100
          ? quorumRaw
          : track.firstCallQuorumPct,
      minutes: (formData.get("minutes") as string) || null,
    },
  })
  revalidateAgmPaths()
  return { success: true }
}

// Wipe this track's agenda and re-seed it from the current default for the
// AGM's year. Used by the "Reset to default agenda" button - lets an
// existing AGM pick up template changes.
export async function resetTrackAgenda(trackId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const track = await db.agmTrack.findFirst({
    where: { id: trackId, agm: { orgId: session.user.orgId } },
    include: { agm: { select: { year: true } } },
  })
  if (!track) return { success: false, error: "Track not found" }

  await db.$transaction([
    db.agmAgendaItem.deleteMany({ where: { trackId } }),
    db.agmAgendaItem.createMany({
      data: agendaSeedFor(track.kind, track.agm.year).map((s, i) => ({
        trackId,
        order: i,
        numeral: s.numeral,
        kind: s.kind,
        titleEs: s.titleEs,
        titleEn: s.titleEn,
        isExtraordinary: s.isExtraordinary ?? false,
      })),
    }),
  ])
  revalidateAgmPaths()
  return { success: true }
}

// Regenerate this track's convocatoria body (callBodyEs/En) from the
// current meeting details - the "Reset to generated text" button.
export async function resetTrackConvocatoria(trackId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const track = await db.agmTrack.findFirst({
    where: { id: trackId, agm: { orgId: session.user.orgId } },
    include: { agm: { select: { date: true, callTimes: true, location: true } } },
  })
  if (!track) return { success: false, error: "Track not found" }

  const md = agmMeetingDateStrings(track.agm.date)
  const full = convocatoriaFullText(track.kind, {
    meetingDateEs: md.es,
    meetingDateEn: md.en,
    callTimes: track.agm.callTimes,
    location: track.agm.location,
    quorumPct: track.firstCallQuorumPct,
  })
  await db.agmTrack.update({
    where: { id: trackId },
    data: { callBodyEs: full.es, callBodyEn: full.en },
  })
  revalidateAgmPaths()
  return { success: true }
}

// --- Agenda items / motions (Board-editable) -------------------------------

async function trackForOrg(trackId: string, orgId: string) {
  return db.agmTrack.findFirst({ where: { id: trackId, agm: { orgId } } })
}

export async function addAgendaItem(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const trackId = formData.get("trackId") as string
  if (!(await trackForOrg(trackId, session.user.orgId))) {
    return { success: false, error: "Track not found" }
  }
  const titleEs = ((formData.get("titleEs") as string) || "").trim()
  const titleEn = ((formData.get("titleEn") as string) || "").trim()
  if (!titleEs && !titleEn) return { success: false, error: "Add the item text in at least one language" }

  const last = await db.agmAgendaItem.findFirst({
    where: { trackId },
    orderBy: { order: "desc" },
  })
  const kind = (formData.get("kind") as string) === "MOTION" ? "MOTION" : "ITEM"
  await db.agmAgendaItem.create({
    data: {
      trackId,
      order: (last?.order ?? -1) + 1,
      numeral: ((formData.get("numeral") as string) || "").trim() || null,
      kind,
      titleEs: titleEs || titleEn,
      titleEn: titleEn || titleEs,
      detailEs: ((formData.get("detailEs") as string) || "").trim() || null,
      detailEn: ((formData.get("detailEn") as string) || "").trim() || null,
      isExtraordinary: formData.get("isExtraordinary") === "on" || formData.get("isExtraordinary") === "true",
    },
  })
  revalidateAgmPaths()
  return { success: true }
}

export async function updateAgendaItem(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const id = formData.get("itemId") as string
  const item = await db.agmAgendaItem.findFirst({
    where: { id, track: { agm: { orgId: session.user.orgId } } },
  })
  if (!item) return { success: false, error: "Item not found" }

  const titleEs = ((formData.get("titleEs") as string) || "").trim()
  const titleEn = ((formData.get("titleEn") as string) || "").trim()
  if (!titleEs && !titleEn) return { success: false, error: "Add the item text in at least one language" }

  await db.agmAgendaItem.update({
    where: { id },
    data: {
      numeral: ((formData.get("numeral") as string) || "").trim() || null,
      kind: (formData.get("kind") as string) === "MOTION" ? "MOTION" : "ITEM",
      titleEs: titleEs || titleEn,
      titleEn: titleEn || titleEs,
      detailEs: ((formData.get("detailEs") as string) || "").trim() || null,
      detailEn: ((formData.get("detailEn") as string) || "").trim() || null,
      isExtraordinary: formData.get("isExtraordinary") === "on" || formData.get("isExtraordinary") === "true",
    },
  })
  revalidateAgmPaths()
  return { success: true }
}

export async function deleteAgendaItem(itemId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const item = await db.agmAgendaItem.findFirst({
    where: { id: itemId, track: { agm: { orgId: session.user.orgId } } },
  })
  if (!item) return { success: false, error: "Item not found" }
  await db.agmAgendaItem.delete({ where: { id: itemId } })
  revalidateAgmPaths()
  return { success: true }
}

// Swap this item's `order` with its neighbour in the given direction.
export async function moveAgendaItem(itemId: string, direction: "up" | "down"): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const item = await db.agmAgendaItem.findFirst({
    where: { id: itemId, track: { agm: { orgId: session.user.orgId } } },
  })
  if (!item) return { success: false, error: "Item not found" }

  const neighbour = await db.agmAgendaItem.findFirst({
    where: {
      trackId: item.trackId,
      order: direction === "up" ? { lt: item.order } : { gt: item.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  })
  if (!neighbour) return { success: true } // already at the end

  await db.$transaction([
    db.agmAgendaItem.update({ where: { id: item.id }, data: { order: neighbour.order } }),
    db.agmAgendaItem.update({ where: { id: neighbour.id }, data: { order: item.order } }),
  ])
  revalidateAgmPaths()
  return { success: true }
}

// --- Owner participation / proxy -----------------------------------------

// The owner of the unit responds for it; the Board/PM can also record a
// response on an owner's behalf (phone-in, paper form).
async function canRespondForUnit(
  unitId: string,
  orgId: string,
  userId: string,
  role: string | null,
  isBoardMember: boolean
) {
  if (canManageAgm(role, isBoardMember)) return true
  const ownership = await db.unitOwnership.findFirst({
    where: { unitId, isCurrent: true, ownerId: userId, unit: { orgId } },
  })
  return Boolean(ownership)
}

export async function submitAgmParticipation(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId) return { success: false, error: "Not authorized" }
  const orgId = session.user.orgId
  const agmId = formData.get("agmId") as string
  const unitId = formData.get("unitId") as string

  const agm = await db.agm.findFirst({ where: { id: agmId, orgId } })
  if (!agm) return { success: false, error: "AGM not found" }
  if (
    !(await canRespondForUnit(unitId, orgId, session.user.id, session.user.role, session.user.isBoardMember))
  ) {
    return { success: false, error: "Not authorized for this unit" }
  }

  const statusRaw = (formData.get("status") as string) || ""
  const valid: AgmParticipationStatus[] = [
    "NO_RESPONSE",
    "ATTENDING_IN_PERSON",
    "BY_PROXY",
    "NOT_ATTENDING",
  ]
  if (!valid.includes(statusRaw as AgmParticipationStatus)) {
    return { success: false, error: "Choose how you'll participate" }
  }
  const status = statusRaw as AgmParticipationStatus

  let proxyHolderType: AgmProxyHolderType | null = null
  let proxyHolderName: string | null = null
  let proxyHolderRelation: string | null = null
  if (status === "BY_PROXY") {
    const t = (formData.get("proxyHolderType") as string) || ""
    if (!["OWNER", "FAMILY", "THIRD_PARTY"].includes(t)) {
      return { success: false, error: "Choose who will represent you" }
    }
    proxyHolderType = t as AgmProxyHolderType
    proxyHolderName = ((formData.get("proxyHolderName") as string) || "").trim() || null
    proxyHolderRelation = ((formData.get("proxyHolderRelation") as string) || "").trim() || null
    if (!proxyHolderName) return { success: false, error: "Enter your representative's full name" }
  }

  const existing = await db.agmParticipation.findUnique({
    where: { agmId_unitId: { agmId, unitId } },
  })

  // Optional uploads: signed Regime proxy, signed Civil Association proxy,
  // and the passport/ID copy validating the signature. Each keeps its prior
  // value when no new file is provided.
  async function upload(field: string, prior: string | null): Promise<string | null> {
    const f = formData.get(field)
    if (f instanceof File && f.size > 0) {
      const r = await saveUploadedFile(f, "agm-proxy")
      if (r.success) return r.url
    }
    return prior
  }
  const proxyRegimeDocUrl = await upload("regimeFile", existing?.proxyRegimeDocUrl ?? null)
  const proxyCivilDocUrl = await upload("civilFile", existing?.proxyCivilDocUrl ?? null)
  const proxyIdDocUrl = await upload("idFile", existing?.proxyIdDocUrl ?? null)

  const data = {
    status,
    proxyHolderType,
    proxyHolderName,
    proxyHolderRelation,
    proxyRegimeDocUrl,
    proxyCivilDocUrl,
    proxyIdDocUrl,
    notes: ((formData.get("notes") as string) || "").trim() || null,
    respondedById: session.user.id,
    respondedAt: new Date(),
    // A changed response invalidates any prior proxy verification.
    proxyVerifiedOn: null,
    proxyVerifiedById: null,
  }

  await db.agmParticipation.upsert({
    where: { agmId_unitId: { agmId, unitId } },
    create: { agmId, unitId, ...data },
    update: data,
  })
  revalidateAgmPaths()
  return { success: true }
}

export async function setAgmEligibility(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const agmId = formData.get("agmId") as string
  const unitId = formData.get("unitId") as string
  const agm = await db.agm.findFirst({ where: { id: agmId, orgId: session.user.orgId } })
  if (!agm) return { success: false, error: "AGM not found" }

  const choice = (formData.get("eligible") as string) || "" // "yes" | "no" | "reset"
  const eligibleToVote = choice === "yes" ? true : choice === "no" ? false : null
  const note = ((formData.get("eligibilityNote") as string) || "").trim() || null

  await db.agmParticipation.upsert({
    where: { agmId_unitId: { agmId, unitId } },
    create: { agmId, unitId, eligibleToVote, eligibilityNote: note },
    update: { eligibleToVote, eligibilityNote: note },
  })
  revalidateAgmPaths()
  return { success: true }
}

export async function setProxyVerified(participationId: string, verified: boolean): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManageAgm(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const row = await db.agmParticipation.findFirst({
    where: { id: participationId, agm: { orgId: session.user.orgId } },
  })
  if (!row) return { success: false, error: "Response not found" }
  await db.agmParticipation.update({
    where: { id: participationId },
    data: {
      proxyVerifiedOn: verified ? new Date() : null,
      proxyVerifiedById: verified ? session.user.id : null,
    },
  })
  revalidateAgmPaths()
  return { success: true }
}
