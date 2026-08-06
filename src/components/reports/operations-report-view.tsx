"use client"

import { Printer, Download, FileText, Wrench, TicketIcon, Users, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { downloadCsv } from "@/lib/csv"
import { formatDateISO } from "@/lib/utils"
import { expiryStatusConfig, type ExpiryStatus } from "@/lib/expiry-status"
import type { ContractRow } from "@/lib/reports-data"

function ExpiryBadge({ status }: { status: ExpiryStatus }) {
  const c = expiryStatusConfig[status]
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.color}`}>{c.label}</span>
}

interface OperationsReportData {
  orgName: string
  contracts: ContractRow[]
  activePMContract: { company: { legalName: string }; startDate: Date; endDate: Date | null } | null
  ticketsByStatus: Record<string, number>
  ticketsByPriority: Record<string, number>
  openTickets: { id: string; title: string; priority: string; ageDays: number }[]
  upcomingMeetings: { id: string; title: string; date: Date; location: string | null }[]
  pastMeetings: { id: string; title: string; date: Date; minutes: string | null }[]
  complianceRows: { id: string; title: string; category: string; expiresAt: Date | null; expiryStatus: ExpiryStatus }[]
}

export function OperationsReportView({ data }: { data: OperationsReportData }) {
  function exportContractsCsv() {
    const rows: (string | number)[][] = [["Title", "Type", "Contractor", "Start", "End", "Status"]]
    for (const c of data.contracts) {
      rows.push([
        c.title,
        c.type,
        c.contractor?.name ?? c.contractor?.email ?? "",
        formatDateISO(c.startDate),
        c.endDate ? formatDateISO(c.endDate) : "",
        c.status,
      ])
    }
    downloadCsv(`${data.orgName}-contracts.csv`, rows)
  }

  function exportTicketsCsv() {
    const rows: (string | number)[][] = [["Title", "Priority", "Age (days)"]]
    for (const t of data.openTickets) rows.push([t.title, t.priority, t.ageDays])
    downloadCsv(`${data.orgName}-open-tickets.csv`, rows)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Operations Report</h1>
          <p className="text-gray-500 mt-1">{data.orgName} — generated {formatDateISO(new Date())}</p>
        </div>
        <Button onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">{data.orgName} — Operations Report</h1>
        <p className="text-gray-500 text-sm">Generated {formatDateISO(new Date())}</p>
      </div>

      <Card className="break-inside-avoid">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Contracts
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportContractsCsv} className="gap-1.5 print:hidden">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {data.contracts.length === 0 ? (
            <p className="text-sm text-gray-400">No contracts on file.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-1 font-normal">Title</th>
                  <th className="py-1 font-normal">Contractor</th>
                  <th className="py-1 font-normal">End Date</th>
                  <th className="py-1 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.contracts.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="py-1">{c.title}</td>
                    <td className="py-1">{c.contractor?.name ?? c.contractor?.email ?? "—"}</td>
                    <td className="py-1">{c.endDate ? formatDateISO(c.endDate) : "Ongoing"}</td>
                    <td className="py-1">
                      <ExpiryBadge status={c.expiryStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Property Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {data.activePMContract ? (
            <p>
              <span className="font-medium">{data.activePMContract.company.legalName}</span> — contracted since{" "}
              {formatDateISO(data.activePMContract.startDate)}
            </p>
          ) : (
            <p className="text-gray-400">No active Property Manager on file.</p>
          )}
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TicketIcon className="h-4 w-4" /> Trouble Tickets
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportTicketsCsv} className="gap-1.5 print:hidden">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3 text-sm text-center">
            {Object.entries(data.ticketsByStatus).map(([status, count]) => (
              <div key={status} className="bg-gray-50 rounded-lg py-2">
                <p className="text-lg font-semibold">{count}</p>
                <p className="text-xs text-gray-400">{status.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
          {data.openTickets.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-1 font-normal">Title</th>
                  <th className="py-1 font-normal">Priority</th>
                  <th className="py-1 font-normal text-right">Age</th>
                </tr>
              </thead>
              <tbody>
                {data.openTickets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-1">{t.title}</td>
                    <td className="py-1">{t.priority}</td>
                    <td className="py-1 text-right">{t.ageDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.upcomingMeetings.length === 0 && data.pastMeetings.length === 0 && (
            <p className="text-gray-400">No meetings on file.</p>
          )}
          {data.upcomingMeetings.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span>{m.title}</span>
              <span className="text-xs text-gray-500">{formatDateISO(m.date)} · Upcoming</span>
            </div>
          ))}
          {data.pastMeetings.slice(0, 8).map((m) => (
            <div key={m.id} className="flex items-center justify-between px-3 py-1.5">
              <span>{m.title}</span>
              <span className="text-xs text-gray-400">
                {formatDateISO(m.date)} · {m.minutes ? "Minutes filed" : "Minutes pending"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Compliance Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.complianceRows.length === 0 ? (
            <p className="text-sm text-gray-400">No compliance documents on file.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="py-1 font-normal">Title</th>
                  <th className="py-1 font-normal">Expires</th>
                  <th className="py-1 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.complianceRows.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50">
                    <td className="py-1">{d.title}</td>
                    <td className="py-1">{d.expiresAt ? formatDateISO(d.expiresAt) : "—"}</td>
                    <td className="py-1">
                      <ExpiryBadge status={d.expiryStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
