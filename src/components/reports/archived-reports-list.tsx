import { FileText, Download } from "lucide-react"
import { formatDateISO } from "@/lib/utils"
import { NewDocumentDialog } from "@/app/dashboard/board/documents/new-document-dialog"

export interface ArchivedReport {
  id: string
  title: string
  description: string | null
  fileUrl: string | null
  createdAt: Date
  uploadedByName: string | null
}

// The list of generated report documents (Annual Report, Financial Report,
// per-villa reports, ...) that have been filed to the org's library under
// the "Report" category. Shown on the Board / PM Reports page so each
// produced PDF is visible as it is archived.
export function ArchivedReportsList({ reports }: { reports: ArchivedReport[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Archived reports</h2>
          <p className="text-sm text-gray-500">
            Generated report documents, newest first. Each is also in the Document Library.
          </p>
        </div>
        <NewDocumentDialog triggerLabel="+ Add report" defaultCategory="REPORT" />
      </div>

      {reports.length === 0 ? (
        <div className="border rounded-xl bg-white p-6 text-center text-sm text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          No reports archived yet. Use <span className="font-medium">Add report</span> to file a
          generated PDF &mdash; it appears here and in the Document Library.
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-3 border rounded-xl bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                  {r.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Filed {formatDateISO(r.createdAt)}
                  {r.uploadedByName ? ` by ${r.uploadedByName}` : ""}
                </p>
                {r.description && <p className="text-xs text-gray-500 mt-1">{r.description}</p>}
              </div>
              {r.fileUrl ? (
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Open
                </a>
              ) : (
                <span className="shrink-0 text-xs text-gray-400">No file</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
