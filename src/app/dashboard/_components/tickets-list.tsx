"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TicketManageForm } from "./ticket-manage-form"
import { formatDateTime } from "@/lib/utils"
import { priorityColor, statusColor } from "@/lib/ticket-styles"
import { TicketPriority } from "@/generated/prisma"
import {
  ListSearch,
  ListFilterChips,
  ListPager,
  paginate,
  pageCountFor,
  useListControls,
  type ChipOption,
} from "@/components/ui/list-controls"

const PAGE_SIZE = 20

const STATUS_ORDER = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const
const PRIORITY_ORDER = ["EMERGENCY", "URGENT", "HIGH", "MEDIUM", "LOW"] as const
const statusText = (s: string) => s.replace(/_/g, " ")

type Contractor = { id: string; name: string | null; email: string | null; company: string | null }

export type TicketRow = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  scopeOrUnit: string
  submittedByName: string
  createdAt: string
  assignedName: string | null
  assignedContractorId: string | null
  canManage: boolean
}

export function TicketsList({
  tickets,
  contractors,
}: {
  tickets: TicketRow[]
  contractors: Contractor[]
}) {
  const { search, setSearch, filterFor, toggleFilter, page, setPage } = useListControls()
  const statusSel = filterFor("status")
  const prioritySel = filterFor("priority")

  const statusOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tickets) counts.set(t.status, (counts.get(t.status) ?? 0) + 1)
    return STATUS_ORDER.filter((s) => counts.has(s)).map((s) => ({
      value: s,
      label: statusText(s),
      count: counts.get(s),
    }))
  }, [tickets])

  const priorityOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tickets) counts.set(t.priority, (counts.get(t.priority) ?? 0) + 1)
    return PRIORITY_ORDER.filter((p) => counts.has(p)).map((p) => ({
      value: p,
      label: p.charAt(0) + p.slice(1).toLowerCase(),
      count: counts.get(p),
    }))
  }, [tickets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (statusSel.length > 0 && !statusSel.includes(t.status)) return false
      if (prioritySel.length > 0 && !prioritySel.includes(t.priority)) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.scopeOrUnit.toLowerCase().includes(q) ||
        t.submittedByName.toLowerCase().includes(q) ||
        (t.assignedName ?? "").toLowerCase().includes(q)
      )
    })
  }, [tickets, search, statusSel, prioritySel])

  const pageCount = pageCountFor(filtered.length, PAGE_SIZE)
  const safePage = Math.min(page, pageCount)
  const visible = paginate(filtered, safePage, PAGE_SIZE)

  return (
    <div className="space-y-3">
      {tickets.length > 8 && (
        <>
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Search by title, unit, or person..."
          />
          <div className="space-y-2">
            {statusOptions.length > 1 && (
              <ListFilterChips
                label="Status"
                options={statusOptions}
                selected={statusSel}
                onToggle={toggleFilter("status")}
              />
            )}
            {priorityOptions.length > 1 && (
              <ListFilterChips
                label="Priority"
                options={priorityOptions}
                selected={prioritySel}
                onToggle={toggleFilter("priority")}
              />
            )}
          </div>
        </>
      )}

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">No tickets yet.</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">No tickets match your search.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[t.priority] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {t.priority}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {statusText(t.status)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                        {t.scopeOrUnit}
                      </span>
                    </div>
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                      <span>
                        Submitted by {t.submittedByName} on {formatDateTime(t.createdAt)}
                      </span>
                    </div>
                    {t.assignedName && (
                      <p className="text-xs text-blue-600 mt-1">Assigned to {t.assignedName}</p>
                    )}
                  </div>
                  {t.canManage && t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                    <TicketManageForm
                      ticketId={t.id}
                      contractors={contractors}
                      currentContractorId={t.assignedContractorId ?? undefined}
                      currentPriority={t.priority as TicketPriority}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListPager
        page={safePage}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
        noun="tickets"
      />
    </div>
  )
}
