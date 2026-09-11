"use client"

import Link from "next/link"
import { CalendarDays, MapPin, User, Video, FileText, CheckCircle2, Circle, Send, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel } from "@/components/ui/tabs"
import { formatDateISO } from "@/lib/utils"
import type { AgmTally } from "@/lib/agm-shared"
import type { AgmChecklistItem } from "@/lib/agm"
import { AGM_TRACK_LABEL } from "@/lib/agm-shared"
import { AgmView, TRACK_SHORT, STATUS_LABEL } from "./types"
import { AgmDetailsDialog } from "./agm-details-dialog"
import { AgendaEditor } from "./agenda-editor"
import { ParticipationConsole } from "./participation-console"
import { PackageDocumentsManager, type PackageDocumentItem, type AvailableDocument } from "./package-documents-manager"

function ChecklistStrip({ items }: { items: AgmChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Readiness checklist</h2>
        <span className="text-xs text-gray-400">
          {doneCount} of {items.length} ready
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {items.map((item, i) => (
          <div
            key={item.key}
            className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center ${
              item.done ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
            }`}
          >
            {item.done ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300" />
            )}
            <p className={`text-[11px] leading-tight ${item.done ? "text-green-800" : "text-gray-500"}`}>
              {i + 1}. {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function KeyDate({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">
        {value ? formatDateISO(new Date(value)) : "—"}
      </p>
    </div>
  )
}

export function AgmManager({
  agm,
  tally,
  ownerByUnit,
  canManage,
  docBasePath,
  checklist,
  documentItems,
  availableDocuments,
}: {
  agm: AgmView
  tally: AgmTally
  ownerByUnit: Record<string, string>
  canManage: boolean
  // When set (Board view), shows the "Meeting documents" generators.
  docBasePath?: string
  checklist?: AgmChecklistItem[]
  documentItems?: PackageDocumentItem[]
  availableDocuments?: AvailableDocument[]
}) {
  const meetingDate = new Date(agm.date)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              Annual General Meeting <span className="text-gray-400 font-normal">{agm.year}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
              <span className="flex items-center gap-1.5 font-medium text-gray-900">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                {formatDateISO(meetingDate)}
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
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={agm.status === "COMPLETED" ? "secondary" : "outline"}>
              {STATUS_LABEL[agm.status]}
            </Badge>
            {canManage && <AgmDetailsDialog agm={agm} />}
          </div>
        </div>

        {agm.zoomInfo && (
          <p className="mt-2 text-xs text-gray-500 flex items-start gap-1.5">
            <Video className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="whitespace-pre-line">{agm.zoomInfo}</span>
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white border rounded-xl p-4">
          <KeyDate label="Notice issued" value={agm.noticeIssuedOn} />
          <KeyDate label="Proxy deadline" value={agm.proxyDeadline} />
          <KeyDate label="RSVP deadline" value={agm.rsvpDeadline} />
          <KeyDate label="Meeting" value={agm.date} />
          <KeyDate label="Minutes filed" value={agm.minutesFiledOn} />
        </div>
      </div>

      {canManage && checklist && checklist.length > 0 && <ChecklistStrip items={checklist} />}

      {canManage && (
        <Link
          href="/dashboard/board/agm/call"
          className="flex items-center justify-between gap-3 bg-white border rounded-xl p-4 hover:border-gray-300"
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-gray-400" /> Send the call
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Proactively issue every owner a no-login link to their own personalized package -
              required, not just available for pickup.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
        </Link>
      )}

      <ParticipationConsole
        agmId={agm.id}
        tally={tally}
        ownerByUnit={ownerByUnit}
        canManage={canManage}
      />

      {canManage && documentItems && (
        <PackageDocumentsManager items={documentItems} availableDocuments={availableDocuments ?? []} />
      )}

      {docBasePath && canManage && (
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Meeting documents</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${docBasePath}/documents/packet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-900 bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            >
              <FileText className="h-3.5 w-3.5" /> Detailed package (one PDF)
            </a>
            <a
              href={`${docBasePath}/documents/summary`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <FileText className="h-3.5 w-3.5 text-gray-400" /> Summary package (one PDF)
            </a>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 mb-2">
            Detailed package: cover letter + both convocatorias + dues schedule. Summary package: a
            plain-language overview + both convocatorias + a collapsed dues total. Or open a single
            section:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: `${docBasePath}/documents/cover-email`, label: "Cover email" },
              {
                href: `${docBasePath}/documents/convocatoria?track=REGIME`,
                label: "Convocatoria — Regime",
              },
              {
                href: `${docBasePath}/documents/convocatoria?track=CIVIL_ASSOCIATION`,
                label: "Convocatoria — Civil Association",
              },
              { href: `${docBasePath}/documents/dues`, label: "Dues schedule" },
            ].map((d) => (
              <a
                key={d.href}
                href={d.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-gray-50"
              >
                <FileText className="h-3.5 w-3.5 text-gray-400" /> {d.label}
              </a>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Generated live from this AGM&apos;s details and agenda. The financial report and proposed
            budget are attached separately; each owner gets their own proxy letters from their AGM page.
          </p>
        </div>
      )}

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
          <TabsPanel key={t.id} value={t.kind} className="pt-4">
            <p className="text-xs text-gray-500 mb-3">{AGM_TRACK_LABEL[t.kind].en}</p>
            <AgendaEditor agm={agm} track={t} canManage={canManage} />
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  )
}
