"use client"

import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  User,
  Video,
  CheckCircle2,
  CircleAlert,
  FileDown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel } from "@/components/ui/tabs"
import { formatDateISO } from "@/lib/utils"
import { AGM_TRACK_LABEL } from "@/lib/agm-shared"
import type { AgmParticipationStatus, AgmProxyHolderType } from "@/generated/prisma"
import { AgmView, TRACK_SHORT, STATUS_LABEL, PARTICIPATION_LABEL, PROXY_TYPE_LABEL } from "./types"
import { OwnerRsvpDialog } from "./owner-rsvp-dialog"

export type OwnerVilla = {
  unitId: string
  label: string
  status: AgmParticipationStatus
  eligible: boolean
  eligibilityReviewed: boolean
  eligibilityNote: string | null
  proxyHolderName: string | null
  proxyHolderType: AgmProxyHolderType | null
  proxyDocsComplete: boolean
  proxyVerified: boolean
  respondedAt: string | null
}

function KeyDate({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value ? formatDateISO(value) : "—"}</p>
    </div>
  )
}

function statusTone(s: AgmParticipationStatus) {
  if (s === "ATTENDING_IN_PERSON" || s === "BY_PROXY") return "default"
  if (s === "NOT_ATTENDING") return "secondary"
  return "outline"
}

export function OwnerAgmView({
  agm,
  myVillas,
  backHref,
}: {
  agm: AgmView
  myVillas: OwnerVilla[]
  backHref: string
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Governance
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Annual General Meeting <span className="text-gray-400 font-normal">{agm.year}</span>
          </h1>
          <Badge variant={agm.status === "COMPLETED" ? "secondary" : "outline"}>
            {STATUS_LABEL[agm.status]}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
          <span className="flex items-center gap-1.5 font-medium text-gray-900">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            {formatDateISO(agm.date)}
            {agm.callTimes && <span className="font-normal text-gray-500">· {agm.callTimes}</span>}
          </span>
          {agm.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-gray-400" /> {agm.location}
            </span>
          )}
          {agm.chairpersonName && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-gray-400" /> Chaired by {agm.chairpersonName}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white border rounded-xl p-4">
        <KeyDate label="Notice issued" value={agm.noticeIssuedOn} />
        <KeyDate label="Proxy deadline" value={agm.proxyDeadline} />
        <KeyDate label="RSVP deadline" value={agm.rsvpDeadline} />
        <KeyDate label="Meeting" value={agm.date} />
        <KeyDate label="Minutes filed" value={agm.minutesFiledOn} />
      </div>

      {agm.zoomInfo && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-blue-900 mb-1">
            <Video className="h-4 w-4" /> Remote participation
          </p>
          <p className="whitespace-pre-line text-blue-900/80">{agm.zoomInfo}</p>
          <p className="text-xs text-blue-900/60 mt-2">
            Connecting by Zoom does not by itself count as valid participation — to be counted you
            must appoint a representative who attends in person with your signed proxy letters.
          </p>
        </div>
      )}

      {/* Your package */}
      {myVillas.length > 0 && (
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-900">Your AGM package</p>
            <p className="text-xs text-indigo-900/70">
              Cover letter, both convocatorias, the dues schedule and your pre-filled proxy letters —
              one PDF. Come back to your unit and grab it any time.
            </p>
          </div>
          <a
            href="/dashboard/owner/governance/agm/packet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 text-white text-sm px-3 py-1.5 hover:bg-indigo-700 shrink-0"
          >
            <FileDown className="h-4 w-4" /> Get your package
          </a>
        </div>
      )}

      {/* Your participation */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Your participation</h2>
        {myVillas.length === 0 && (
          <p className="text-sm text-gray-400">
            You don&apos;t have a villa on record for this HOA, so there is nothing to confirm.
          </p>
        )}
        <div className="space-y-3">
          {myVillas.map((v) => (
            <div key={v.unitId} className="bg-white border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{v.label}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant={statusTone(v.status)}>{PARTICIPATION_LABEL[v.status]}</Badge>
                    {v.eligible ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Eligible to vote
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                        <CircleAlert className="h-3.5 w-3.5" /> Not eligible to vote
                      </span>
                    )}
                  </div>
                  {!v.eligible && (
                    <p className="text-xs text-gray-500 mt-1">
                      {v.eligibilityNote ||
                        "Voting eligibility requires the villa to be current on maintenance and special fees. Check your Dues & Assessments page or contact the Board."}
                    </p>
                  )}
                  {v.status === "BY_PROXY" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Representative: {v.proxyHolderName ?? "—"}
                      {v.proxyHolderType && ` (${PROXY_TYPE_LABEL[v.proxyHolderType]})`} ·{" "}
                      {v.proxyVerified
                        ? "verified by the Board"
                        : v.proxyDocsComplete
                          ? "documents received, pending verification"
                          : "signed proxy letters still needed"}
                    </p>
                  )}
                  {v.respondedAt && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Last updated {formatDateISO(v.respondedAt)}
                    </p>
                  )}
                </div>
                <OwnerRsvpDialog agmId={agm.id} villa={v} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agendas */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Agenda</h2>
        <Tabs defaultValue={agm.tracks[0]?.kind ?? "REGIME"}>
          <TabsList>
            {agm.tracks.map((t) => (
              <TabsTab key={t.id} value={t.kind}>
                {TRACK_SHORT[t.kind]}
              </TabsTab>
            ))}
            <TabsIndicator />
          </TabsList>
          {agm.tracks.map((t) => (
            <TabsPanel key={t.id} value={t.kind} className="pt-4 space-y-3">
              <p className="text-xs text-gray-500">{AGM_TRACK_LABEL[t.kind].en}</p>
              {(t.callBodyEn || t.callBodyEs) && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-line text-gray-700">
                  {t.callBodyEn || t.callBodyEs}
                </div>
              )}
              <ol className="space-y-2">
                {t.items.map((item, i) => (
                  <li key={item.id} className="bg-white border rounded-lg px-4 py-3 flex gap-3">
                    <span className="text-sm font-semibold text-gray-400 w-8 shrink-0">
                      {item.numeral || i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900">{item.titleEn}</p>
                      {item.titleEs && item.titleEs !== item.titleEn && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.titleEs}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant={item.kind === "MOTION" ? "default" : "outline"}>
                          {item.kind === "MOTION" ? "Motion" : "Item"}
                        </Badge>
                        {item.isExtraordinary && <Badge variant="secondary">Extraordinary</Badge>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsPanel>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
