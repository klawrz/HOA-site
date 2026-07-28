"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Trash2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import {
  complianceCategoryLabel,
  complianceStatusConfig,
  getComplianceStatus,
  meetingDocTypeLabel,
  getMinutesFilingStatus,
  minutesFilingStatusConfig,
} from "@/lib/compliance-styles"
import { deleteComplianceDocument } from "@/app/actions/compliance-documents"

type ComplianceDoc = {
  id: string
  title: string
  category: string
  description: string | null
  fileUrl: string | null
  language: string | null
  issuedAt: Date | null
  expiresAt: Date | null
  reminderDaysBefore: number
  meetingYear: number | null
  meetingDocType: string | null
  minutesFilingRequired: boolean | null
  minutesFiled: boolean | null
  minutesFiledAt: Date | null
  createdAt: Date
  uploadedBy: { name: string | null; email: string }
}

export function ComplianceDocumentList({
  documents,
  canManage,
  emptyMessage = "No compliance documents yet. Add the first one.",
}: {
  documents: ComplianceDoc[]
  canManage: boolean
  emptyMessage?: string
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await deleteComplianceDocument(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove document")
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          {emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((d) => {
        const isMinutes = d.category === "HOMEOWNER_MEETINGS" && d.meetingDocType === "MINUTES"
        const status = getComplianceStatus(d.expiresAt, d.reminderDaysBefore)
        const statusCfg = complianceStatusConfig[status]
        const minutesStatus = isMinutes
          ? minutesFilingStatusConfig[getMinutesFilingStatus(d.minutesFilingRequired, d.minutesFiled)]
          : null
        return (
          <Card key={d.id}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{d.title}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                        {complianceCategoryLabel[d.category]}
                      </span>
                      {d.meetingYear && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                          {d.meetingYear}
                          {d.meetingDocType && ` · ${meetingDocTypeLabel[d.meetingDocType]}`}
                        </span>
                      )}
                      {minutesStatus && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${minutesStatus.color}`}>
                          {minutesStatus.label}
                          {d.minutesFiled && d.minutesFiledAt && ` (${formatDateTime(d.minutesFiledAt)})`}
                        </span>
                      )}
                      {!d.meetingYear && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      )}
                      {d.language && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                          {d.language}
                        </span>
                      )}
                    </div>
                    {d.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-1">
                      {d.issuedAt && <span>Issued {formatDateTime(d.issuedAt)}</span>}
                      {d.expiresAt && <span>Expires {formatDateTime(d.expiresAt)}</span>}
                      <span>
                        Added {formatDateTime(d.createdAt)} by {d.uploadedBy.name ?? d.uploadedBy.email}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {d.fileUrl && (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View file
                    </a>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleRemove(d.id)}
                      disabled={removingId === d.id}
                      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
