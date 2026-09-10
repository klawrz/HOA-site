"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateTicketStatus, setTicketCostEstimate } from "@/app/actions/tickets"
import { formatMoney } from "@/lib/currency"
import type { Currency, TicketStatus } from "@/generated/prisma"

const STATUS_LABELS: Record<TicketStatus, string> = {
  ACTIVE: "Active",
  DEFERRED: "Deferred",
  CLOSED: "Closed",
}

export function TicketStatusControls({
  ticketId,
  currentStatus,
  canEditStatus,
  canEstimate,
  costEstimate,
  costEstimateNote,
  costEstimateCurrency,
  baseCurrency,
}: {
  ticketId: string
  currentStatus: TicketStatus
  canEditStatus: boolean
  canEstimate: boolean
  costEstimate: number | null
  costEstimateNote: string | null
  costEstimateCurrency: Currency | null
  baseCurrency: Currency
}) {
  const router = useRouter()
  const displayCurrency = costEstimateCurrency ?? baseCurrency
  const [status, setStatus] = useState<TicketStatus>(currentStatus)
  const [busy, setBusy] = useState(false)
  const [editingEstimate, setEditingEstimate] = useState(false)
  const [costInput, setCostInput] = useState(costEstimate != null ? String(costEstimate) : "")
  const [noteInput, setNoteInput] = useState(costEstimateNote ?? "")
  const [currencyInput, setCurrencyInput] = useState<Currency>(costEstimateCurrency ?? baseCurrency)

  if (!canEditStatus && !canEstimate) return null

  async function handleStatusChange(v: string | null) {
    if (!v || v === status) return
    const next = v as TicketStatus
    const prev = status
    setStatus(next)
    setBusy(true)
    const res = await updateTicketStatus(ticketId, next)
    setBusy(false)
    if (res.success) {
      toast.success(`Marked ${STATUS_LABELS[next].toLowerCase()}`)
      router.refresh()
    } else {
      setStatus(prev)
      toast.error("Couldn't update status")
    }
  }

  async function saveEstimate(clear: boolean) {
    const parsed = clear ? null : Number(costInput.replace(/[^0-9.]/g, ""))
    if (!clear && (parsed == null || !Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Enter a valid amount")
      return
    }
    setBusy(true)
    const res = await setTicketCostEstimate(ticketId, {
      cost: clear ? null : parsed,
      note: clear ? "" : noteInput,
      currency: currencyInput,
    })
    setBusy(false)
    if (res.success) {
      toast.success(clear ? "Estimate cleared" : "Estimate saved")
      setEditingEstimate(false)
      if (clear) {
        setCostInput("")
        setNoteInput("")
        setCurrencyInput(baseCurrency)
      }
      router.refresh()
    } else {
      toast.error(res.error || "Couldn't save estimate")
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:w-52 shrink-0">
      {canEditStatus && (
        <Select
          value={status}
          onValueChange={handleStatusChange}
          items={STATUS_LABELS}
        >
          <SelectTrigger className="h-8 text-xs" disabled={busy}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DEFERRED">Deferred</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      )}

      {canEstimate &&
        (editingEstimate ? (
          <div className="space-y-1.5 rounded-lg border p-2">
            <div className="flex gap-1.5">
              <Select
                value={currencyInput}
                onValueChange={(v) => v && setCurrencyInput(v as Currency)}
                items={{ USD: "USD", MXN: "MXN" }}
              >
                <SelectTrigger className="h-7 w-[4.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                placeholder="Cost to resolve"
                className="h-7 flex-1 text-xs"
              />
            </div>
            <Input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Note (who quoted, scope)"
              className="h-7 text-xs"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 flex-1 text-xs" disabled={busy} onClick={() => saveEstimate(false)}>
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={busy}
                onClick={() => {
                  setEditingEstimate(false)
                  setCostInput(costEstimate != null ? String(costEstimate) : "")
                  setNoteInput(costEstimateNote ?? "")
                  setCurrencyInput(costEstimateCurrency ?? baseCurrency)
                }}
              >
                Cancel
              </Button>
            </div>
            {costEstimate != null && (
              <button
                type="button"
                className="text-[11px] text-gray-400 hover:text-red-600"
                disabled={busy}
                onClick={() => saveEstimate(true)}
              >
                Clear estimate
              </button>
            )}
          </div>
        ) : costEstimate != null ? (
          <button
            type="button"
            onClick={() => setEditingEstimate(true)}
            className="group rounded-lg border px-2.5 py-1.5 text-left text-xs hover:border-gray-400"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium text-gray-700">
                Est. to resolve: {formatMoney(costEstimate, displayCurrency)}
                {displayCurrency !== "USD" && ` ${displayCurrency}`}
              </span>
              <Pencil className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
            </span>
            {costEstimateNote && <span className="mt-0.5 block text-gray-400">{costEstimateNote}</span>}
          </button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setEditingEstimate(true)}
          >
            + Add cost estimate
          </Button>
        ))}
    </div>
  )
}
