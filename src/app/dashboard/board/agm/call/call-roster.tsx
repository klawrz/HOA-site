"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Send, Copy, Check, ExternalLink, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { issueAgmCall } from "@/app/actions/agm"
import { formatDateTime } from "@/lib/utils"
import { downloadCsv } from "@/lib/csv"

export type CallRosterRow = {
  unitId: string
  label: string
  ownerNames: string
  token: string | null
  sentAt: string | null
  openedAt: string | null
}

function linkFor(token: string) {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/agm-package/${token}`
}

function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(linkFor(token))
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  )
}

export function CallRoster({ rows, sent }: { rows: CallRosterRow[]; sent: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function send() {
    startTransition(async () => {
      const r = await issueAgmCall()
      if (r.success) {
        toast.success("Call sent - every unit now has a link to its own package")
        router.refresh()
      } else {
        toast.error(r.error || "Could not send the call")
      }
    })
  }

  function exportCsv() {
    const header = ["Unit", "Owner(s)", "Link", "Sent", "Opened"]
    const rowsOut = rows.map((r) => [
      r.label,
      r.ownerNames,
      r.token ? linkFor(r.token) : "",
      r.sentAt ? formatDateTime(r.sentAt) : "",
      r.openedAt ? formatDateTime(r.openedAt) : "",
    ])
    downloadCsv("agm-call-links.csv", [header, ...rowsOut])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 bg-white border rounded-xl p-4">
        <div>
          <p className="font-medium">{sent ? "Call already sent" : "Send the call"}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Generates a no-login link per unit to that unit&apos;s own personalized package (their
            preferred summary/detailed doc + pre-filled proxy letters), and marks the notice issued.
            Sending again keeps existing links working - safe to re-run for units added later.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export links (CSV)
          </Button>
          <Button size="sm" onClick={send} disabled={pending} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> {sent ? "Re-send to all" : "Send the call"}
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500">
              <th className="text-left font-medium px-3 py-2">Unit</th>
              <th className="text-left font-medium px-3 py-2">Owner(s)</th>
              <th className="text-left font-medium px-3 py-2">Sent</th>
              <th className="text-left font-medium px-3 py-2">Opened</th>
              <th className="text-left font-medium px-3 py-2">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.unitId}>
                <td className="px-3 py-2 font-medium">{r.label}</td>
                <td className="px-3 py-2 text-gray-600">{r.ownerNames}</td>
                <td className="px-3 py-2 text-gray-500">
                  {r.sentAt ? formatDateTime(r.sentAt) : <span className="text-gray-300">Not sent</span>}
                </td>
                <td className="px-3 py-2">
                  {r.openedAt ? (
                    <span className="text-green-700">{formatDateTime(r.openedAt)}</span>
                  ) : (
                    <span className="text-gray-300">Not opened</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {r.token ? (
                    <div className="flex items-center gap-2">
                      <CopyButton token={r.token} />
                      <a
                        href={`/agm-package/${r.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">Not generated yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
