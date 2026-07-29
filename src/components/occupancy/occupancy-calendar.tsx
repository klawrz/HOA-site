"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, Trash2, Pencil, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { occupancyTypeLabel, occupancyTypeColor } from "@/lib/occupancy-styles"
import { rangesOverlap } from "@/lib/occupancy"
import { OccupancyType } from "@/generated/prisma"
import {
  createOccupancyEntry,
  updateOccupancyEntry,
  deleteOccupancyEntry,
} from "@/app/actions/occupancy"

const types = Object.keys(occupancyTypeLabel) as OccupancyType[]

type OccupancyEntryRow = {
  id: string
  startDate: Date
  endDate: Date
  type: string
  occupantName: string | null
  occupantContact: string | null
  notes: string | null
}

type Conflict = {
  type: string
  occupantName: string | null
  startDate: Date
  endDate: Date
}

type PendingEntry = {
  startDate: string
  endDate: string
  type: OccupancyType
  occupantName?: string
  occupantContact?: string
  notes?: string
}

// Must match formatDate's local-timezone day, or the edit form's prefilled
// date drifts a day from what the list displays.
function toDateInputValue(d: Date) {
  const date = new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function EntryFormDialog({
  unitId,
  mode,
  entry,
  triggerButton,
  triggerLabel,
}: {
  unitId: string
  mode: "create" | "edit"
  entry?: OccupancyEntryRow
  triggerButton: React.ReactElement
  triggerLabel: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<OccupancyType>((entry?.type as OccupancyType) ?? "OWNER_FAMILY")
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null)
  const [pending, setPending] = useState<PendingEntry | null>(null)
  const formId = `occupancy-form-${mode}-${entry?.id ?? unitId}`

  function resetAll() {
    setOpen(false)
    setType((entry?.type as OccupancyType) ?? "OWNER_FAMILY")
    setConflicts(null)
    setPending(null)
    ;(document.getElementById(formId) as HTMLFormElement)?.reset()
  }

  async function submitEntry(payload: PendingEntry, acknowledgeConflict = false) {
    setSaving(true)
    const result =
      mode === "create"
        ? await createOccupancyEntry(unitId, payload, acknowledgeConflict)
        : await updateOccupancyEntry(entry!.id, payload, acknowledgeConflict)
    setSaving(false)
    if (result.success) {
      toast.success(
        acknowledgeConflict
          ? "Entry saved despite overlap"
          : mode === "create"
            ? "Occupancy entry added"
            : "Occupancy entry updated"
      )
      resetAll()
    } else if (result.conflict) {
      setPending(payload)
      setConflicts(result.conflicts ?? [])
    } else {
      toast.error(result.error ?? "Failed to save entry")
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await submitEntry({
      startDate: form.get("startDate") as string,
      endDate: form.get("endDate") as string,
      type,
      occupantName: (form.get("occupantName") as string) || undefined,
      occupantContact: (form.get("occupantContact") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    })
  }

  if (conflicts) {
    return (
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : resetAll())}>
        <DialogTrigger render={triggerButton}>{triggerLabel}</DialogTrigger>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Overlaps with existing entries
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              This date range overlaps with {conflicts.length} existing entr
              {conflicts.length === 1 ? "y" : "ies"}. You can save it anyway if that&apos;s intentional.
            </p>
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className="border border-amber-200 bg-amber-50 rounded-lg p-2 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${occupancyTypeColor[c.type]}`}>
                    {occupancyTypeLabel[c.type]}
                  </span>
                  {c.occupantName && <span className="ml-2 font-medium">{c.occupantName}</span>}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(c.startDate)} – {formatDate(c.endDate)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={resetAll}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => pending && submitEntry(pending, true)}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Anyway"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : resetAll())}>
      <DialogTrigger render={triggerButton}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Occupancy Entry" : "Edit Occupancy Entry"}</DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as OccupancyType)} items={occupancyTypeLabel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {occupancyTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input
                name="startDate"
                type="date"
                required
                defaultValue={entry ? toDateInputValue(entry.startDate) : undefined}
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input
                name="endDate"
                type="date"
                required
                defaultValue={entry ? toDateInputValue(entry.endDate) : undefined}
              />
            </div>
          </div>
          {type !== "VACANT" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Occupant Name</Label>
                <Input name="occupantName" placeholder="Jane Doe" defaultValue={entry?.occupantName ?? undefined} />
              </div>
              <div className="space-y-1">
                <Label>Contact</Label>
                <Input
                  name="occupantContact"
                  placeholder="Phone or email"
                  defaultValue={entry?.occupantContact ?? undefined}
                />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea
              name="notes"
              placeholder="Optional notes..."
              className="h-16 resize-none"
              defaultValue={entry?.notes ?? undefined}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={resetAll}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Add Entry" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OccupancyCalendar({
  unitId,
  entries,
  canManage,
}: {
  unitId: string
  entries: OccupancyEntryRow[]
  canManage: boolean
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await deleteOccupancyEntry(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove entry")
  }

  const sorted = [...entries].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  function conflictsFor(entry: OccupancyEntryRow) {
    return sorted.filter(
      (other) => other.id !== entry.id && rangesOverlap(entry.startDate, entry.endDate, other.startDate, other.endDate)
    )
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex justify-end">
          <EntryFormDialog
            unitId={unitId}
            mode="create"
            triggerButton={<Button size="sm" />}
            triggerLabel="+ Add Entry"
          />
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-400">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No occupancy entries logged yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 overflow-hidden">
          <div className="divide-y max-h-[420px] overflow-y-auto">
            {sorted.map((e) => {
              const conflicting = conflictsFor(e)
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 ${
                    conflicting.length > 0 ? "bg-amber-50/60" : ""
                  }`}
                  title={
                    [e.occupantContact, e.notes].filter(Boolean).join(" · ") || undefined
                  }
                >
                  <span
                    className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded-full font-medium ${occupancyTypeColor[e.type]}`}
                  >
                    {occupancyTypeLabel[e.type]}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                    {formatDate(e.startDate)} – {formatDate(e.endDate)}
                  </span>
                  <span className="truncate font-medium">{e.occupantName ?? "—"}</span>
                  {conflicting.length > 0 && (
                    <span className="shrink-0 text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Overlap
                    </span>
                  )}
                  {canManage && (
                    <span className="ml-auto flex items-center gap-2 shrink-0">
                      <EntryFormDialog
                        unitId={unitId}
                        mode="edit"
                        entry={e}
                        triggerButton={
                          <button className="text-gray-400 hover:text-blue-500 transition-colors" />
                        }
                        triggerLabel={<Pencil className="h-3.5 w-3.5" />}
                      />
                      <button
                        onClick={() => handleRemove(e.id)}
                        disabled={removingId === e.id}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
