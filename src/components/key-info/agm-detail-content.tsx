import Link from "next/link"
import { ArrowLeft, CalendarDays, MapPin, User, FileText, Download } from "lucide-react"
import { formatDateISO } from "@/lib/utils"
import { AgmEditDialog } from "./agm-edit-dialog"
import { NewDocumentDialog } from "@/app/dashboard/board/documents/new-document-dialog"
import { documentCategoryLabel } from "@/lib/document-styles"
import { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel } from "@/components/ui/tabs"
import type { DocumentCategory, BudgetStatus } from "@/generated/prisma"

type Agm = {
  date: Date
  location: string | null
  chairpersonName: string | null
  agenda: string | null
  proxyProcess: string | null
  proxyFormUrl: string | null
  notes: string | null
  meetingId: string | null
} | null

type PastAgm = { id: string; title: string; date: Date; minutes: string | null }
type RelevantDocument = { id: string; title: string; category: DocumentCategory; fileUrl: string | null }
type LinkedBudget = { id: string; year: number; version: string; status: BudgetStatus; approvedAt: Date | null }

const budgetStatusLabel: Record<BudgetStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
}

// Shared content for the AGM page - rendered under three role-scoped
// routes (Board/PM/Owner), same split as the Reserve Fund pages: the DATA
// query differs per role file (self-contained auth guard each), but the
// actual page body is identical, so it lives here once.
//
// Tabbed rather than stacked cards (2026-08-27, per Dara: "just tabs...
// simplifying as much as we can") - Agenda / Proxies / Budget / Past
// Minutes / Other Documents are the fixed, always-needed sections for an
// AGM, so a tab bar reads better than a scroll of cards that are mostly
// empty most of the year.
export function AgmDetailContent({
  agm,
  canManage,
  backHref,
  backLabel,
  documentsHref,
  budgetsHref,
  pastAgms = [],
  relevantDocuments = [],
  linkedBudgets = [],
}: {
  agm: Agm
  canManage: boolean
  backHref: string
  backLabel: string
  documentsHref: string
  budgetsHref: string
  pastAgms: PastAgm[]
  relevantDocuments: RelevantDocument[]
  linkedBudgets: LinkedBudget[]
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Annual General Meeting</h1>
          {canManage && <AgmEditDialog existing={agm ? toEditFields(agm) : undefined} />}
        </div>

        {agm ? (
          // Date/time/place up front, right under the title - the one
          // thing everyone opening this page needs first, not buried below.
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
            <span className="flex items-center gap-1.5 font-medium text-gray-900">
              <CalendarDays className="h-4 w-4 text-gray-400" />
              {formatDateISO(agm.date)}
              <span className="font-normal text-gray-500">
                {agm.date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
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
        ) : (
          <p className="text-sm text-gray-400 mt-2">No AGM has been scheduled yet.</p>
        )}
      </div>

      {agm && (
        <Tabs defaultValue="agenda">
          <TabsList>
            <TabsTab value="agenda">Agenda</TabsTab>
            <TabsTab value="proxies">Proxies</TabsTab>
            <TabsTab value="budget">Budget</TabsTab>
            <TabsTab value="minutes">Past Minutes</TabsTab>
            <TabsTab value="documents">Other Documents</TabsTab>
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="agenda">
            {agm.agenda ? (
              <p className="text-sm whitespace-pre-line">{agm.agenda}</p>
            ) : (
              <p className="text-sm text-gray-400">No agenda on file yet.</p>
            )}
          </TabsPanel>

          <TabsPanel value="proxies">
            {agm.proxyProcess || agm.proxyFormUrl ? (
              <div className="space-y-2">
                {agm.proxyProcess && <p className="text-sm whitespace-pre-line">{agm.proxyProcess}</p>}
                {agm.proxyFormUrl && (
                  <a
                    href={agm.proxyFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" /> Download proxy form
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No proxy process on file yet.</p>
            )}
          </TabsPanel>

          <TabsPanel value="budget">
            <div className="space-y-2">
              {linkedBudgets.length === 0 && (
                <p className="text-sm text-gray-400">No budget linked to this AGM yet.</p>
              )}
              {linkedBudgets.map((b) => (
                <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-medium">
                    {b.year} Budget <span className="text-gray-400 font-normal">· {b.version}</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {budgetStatusLabel[b.status]}
                    {b.approvedAt && ` · ${formatDateISO(b.approvedAt)}`}
                  </span>
                </div>
              ))}
              <Link href={budgetsHref} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline pt-1">
                View all budgets
              </Link>
            </div>
          </TabsPanel>

          <TabsPanel value="minutes">
            <div className="space-y-3">
              {pastAgms.length === 0 && <p className="text-sm text-gray-400">No previous AGMs on file yet.</p>}
              {pastAgms.map((m) => (
                <div key={m.id} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.title}</span>
                    <span className="text-gray-400">{formatDateISO(m.date)}</span>
                  </div>
                  {m.minutes ? (
                    <p className="text-sm text-gray-700 whitespace-pre-line mt-1 line-clamp-3">{m.minutes}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Minutes not filed yet.</p>
                  )}
                </div>
              ))}
            </div>
          </TabsPanel>

          <TabsPanel value="documents">
            <div className="space-y-2">
              {agm.notes && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 mb-1">
                  <p className="text-xs font-medium text-gray-500 mb-1">Other Information</p>
                  <p className="text-sm whitespace-pre-line">{agm.notes}</p>
                </div>
              )}
              {canManage && agm.meetingId && (
                <div className="flex justify-end">
                  <NewDocumentDialog meetingId={agm.meetingId} triggerLabel="+ Add Document" />
                </div>
              )}
              {relevantDocuments.length === 0 && (
                <p className="text-sm text-gray-400">
                  No documents filed against this AGM yet - notice, financial statements, etc.
                </p>
              )}
              {relevantDocuments.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{d.title}</span>
                    <span className="text-gray-400 ml-2 text-xs">{documentCategoryLabel[d.category]}</span>
                  </div>
                  {d.fileUrl ? (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                    >
                      <Download className="h-3 w-3" /> Open
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">On file</span>
                  )}
                </div>
              ))}
              <Link href={documentsHref} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline pt-1">
                <FileText className="h-3.5 w-3.5" /> Browse the full document repository
              </Link>
            </div>
          </TabsPanel>
        </Tabs>
      )}
    </div>
  )
}

function toEditFields(agm: NonNullable<Agm>) {
  return {
    date: agm.date.toISOString().slice(0, 10),
    time: agm.date.toISOString().slice(11, 16),
    location: agm.location ?? "",
    chairpersonName: agm.chairpersonName ?? "",
    agenda: agm.agenda ?? "",
    proxyProcess: agm.proxyProcess ?? "",
    notes: agm.notes ?? "",
  }
}
