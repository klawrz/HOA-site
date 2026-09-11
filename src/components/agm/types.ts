import type {
  AgmStatus,
  AgmTrackKind,
  AgmAgendaItemKind,
  AgmParticipationStatus,
  AgmProxyHolderType,
} from "@/generated/prisma"

// Client-side shape of an AGM - Date columns arrive as ISO strings after
// the server serialises the record for the client component.

export type AgendaItemView = {
  id: string
  order: number
  numeral: string | null
  kind: AgmAgendaItemKind
  titleEs: string
  titleEn: string
  detailEs: string | null
  detailEn: string | null
  isExtraordinary: boolean
}

export type TrackView = {
  id: string
  kind: AgmTrackKind
  callBodyEs: string | null
  callBodyEn: string | null
  firstCallQuorumPct: number
  minutes: string | null
  items: AgendaItemView[]
}

export type AgmView = {
  id: string
  year: number
  date: string
  location: string | null
  callTimes: string | null
  chairpersonName: string | null
  noticeIssuedOn: string | null
  proxyDeadline: string | null
  rsvpDeadline: string | null
  minutesFiledOn: string | null
  zoomInfo: string | null
  notes: string | null
  proxyContactName: string | null
  proxyContactEmail: string | null
  signatoryNames: string | null
  status: AgmStatus
  tracks: TrackView[]
}

export const TRACK_SHORT: Record<AgmTrackKind, string> = {
  REGIME: "Condominium Regime",
  CIVIL_ASSOCIATION: "Civil Association",
}

export const STATUS_LABEL: Record<AgmStatus, string> = {
  DRAFT: "Draft",
  NOTICE_ISSUED: "Notice issued",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
}

export const PARTICIPATION_LABEL: Record<AgmParticipationStatus, string> = {
  NO_RESPONSE: "No response",
  ATTENDING_IN_PERSON: "Attending in person",
  BY_PROXY: "By proxy",
  NOT_ATTENDING: "Not attending",
}

export const PROXY_TYPE_LABEL: Record<AgmProxyHolderType, string> = {
  OWNER: "Another owner",
  FAMILY: "Family member",
  THIRD_PARTY: "Third party",
}
