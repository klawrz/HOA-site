"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, FileText, RotateCcw } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import {
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  moveAgendaItem,
  updateAgmTrack,
  resetTrackAgenda,
} from "@/app/actions/agm"
import { convocatoriaFullText, agmMeetingDateStrings } from "@/lib/agm-shared"
import { AgendaItemView, TrackView, AgmView } from "./types"

function generatedConvocatoria(agm: AgmView, track: TrackView) {
  const md = agmMeetingDateStrings(agm.date)
  return convocatoriaFullText(track.kind, {
    meetingDateEs: md.es,
    meetingDateEn: md.en,
    callTimes: agm.callTimes,
    location: agm.location,
    quorumPct: track.firstCallQuorumPct,
  })
}

function AgendaItemDialog({
  trackId,
  item,
  trigger,
}: {
  trackId: string
  item?: AgendaItemView
  trigger: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [kind, setKind] = useState<AgendaItemView["kind"]>(item?.kind ?? "ITEM")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    fd.set("kind", kind)
    const result = item ? await updateAgendaItem(fd) : await addAgendaItem(fd)
    setSaving(false)
    if (result.success) {
      toast.success(item ? "Agenda item updated" : "Agenda item added")
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit agenda item" : "Add agenda item or motion"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {item ? (
            <input type="hidden" name="itemId" value={item.id} />
          ) : (
            <input type="hidden" name="trackId" value={trackId} />
          )}
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <div className="space-y-1">
              <Label>Numeral</Label>
              <Input name="numeral" defaultValue={item?.numeral ?? ""} placeholder="V" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <div className="flex gap-2 pt-1">
                {(["ITEM", "MOTION"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                      kind === k
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                  >
                    {k === "ITEM" ? "Agenda item" : "Motion / vote"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Text — English</Label>
            <Textarea name="titleEn" className="h-16 text-sm" defaultValue={item?.titleEn ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Texto — Español</Label>
            <Textarea name="titleEs" className="h-16 text-sm" defaultValue={item?.titleEs ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Detail — English (optional)</Label>
              <Textarea name="detailEn" className="h-14 text-sm" defaultValue={item?.detailEn ?? ""} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Detalle — Español (opcional)</Label>
              <Textarea name="detailEs" className="h-14 text-sm" defaultValue={item?.detailEs ?? ""} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="isExtraordinary"
              defaultChecked={item?.isExtraordinary ?? false}
            />
            Extraordinary matter (folded into the ordinary meeting)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConvocatoriaDialog({ agm, track }: { agm: AgmView; track: TrackView }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const gen = generatedConvocatoria(agm, track)
  const [bodyEn, setBodyEn] = useState(track.callBodyEn || gen.en)
  const [bodyEs, setBodyEs] = useState(track.callBodyEs || gen.es)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const result = await updateAgmTrack(new FormData(e.currentTarget))
    setSaving(false)
    if (result.success) {
      toast.success("Convocatoria saved")
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <FileText className="h-3.5 w-3.5" /> Edit the notice
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convocatoria — {track.kind === "REGIME" ? "Condominium Regime" : "Civil Association"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="trackId" value={track.id} />
          <div className="space-y-1">
            <Label>First-call quorum (% of villas)</Label>
            <Input
              name="firstCallQuorumPct"
              type="number"
              step="1"
              min="1"
              max="100"
              defaultValue={track.firstCallQuorumPct}
            />
            <p className="text-[11px] text-gray-400">
              2013 Regime: 50% of villas (one villa, one vote). On the second call the assembly is
              valid with whoever is present.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label>The full notice text — heading, opening paragraph, quorum clause</Label>
            <button
              type="button"
              onClick={() => {
                setBodyEn(gen.en)
                setBodyEs(gen.es)
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Reset to generated text
            </button>
          </div>
          <p className="text-[11px] text-gray-400 -mt-1">
            The ORDEN DEL DÍA / AGENDA list and the signature block are added automatically from the
            agenda below.
          </p>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">English</Label>
            <Textarea
              name="callBodyEn"
              className="h-40 text-sm"
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Español</Label>
            <Textarea
              name="callBodyEs"
              className="h-40 text-sm"
              value={bodyEs}
              onChange={(e) => setBodyEs(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AgendaEditor({
  agm,
  track,
  canManage,
}: {
  agm: AgmView
  track: TrackView
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function resetAgenda() {
    if (!confirm("Replace this track's agenda with the standard default? Your edits will be lost."))
      return
    startTransition(async () => {
      const r = await resetTrackAgenda(track.id)
      if (r.success) {
        toast.success("Agenda reset to the default")
        router.refresh()
      } else {
        toast.error(r.error || "Could not reset")
      }
    })
  }

  function move(itemId: string, direction: "up" | "down") {
    startTransition(async () => {
      const r = await moveAgendaItem(itemId, direction)
      if (r.success) router.refresh()
      else toast.error(r.error || "Could not reorder")
    })
  }

  function remove(itemId: string) {
    if (!confirm("Remove this agenda item?")) return
    startTransition(async () => {
      const r = await deleteAgendaItem(itemId)
      if (r.success) {
        toast.success("Agenda item removed")
        router.refresh()
      } else {
        toast.error(r.error || "Could not remove")
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Agenda / Orden del día</h3>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <ConvocatoriaDialog agm={agm} track={track} />
            <Button size="sm" variant="outline" type="button" disabled={pending} onClick={resetAgenda}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset agenda
            </Button>
            <AgendaItemDialog
              trackId={track.id}
              trigger={
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> Add item
                </Button>
              }
            />
          </div>
        )}
      </div>

      <ol className="space-y-2">
        {track.items.length === 0 && (
          <li className="text-sm text-gray-400">No agenda items yet.</li>
        )}
        {track.items.map((item, i) => (
          <li
            key={item.id}
            className="bg-white border rounded-lg px-4 py-3 flex items-start gap-3"
          >
            <span className="text-sm font-semibold text-gray-400 w-8 shrink-0 pt-0.5">
              {item.numeral || i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900">{item.titleEn}</p>
              {item.titleEs && item.titleEs !== item.titleEn && (
                <p className="text-xs text-gray-500 mt-0.5">{item.titleEs}</p>
              )}
              {(item.detailEn || item.detailEs) && (
                <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">
                  {item.detailEn || item.detailEs}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant={item.kind === "MOTION" ? "default" : "outline"}>
                  {item.kind === "MOTION" ? "Motion" : "Item"}
                </Badge>
                {item.isExtraordinary && <Badge variant="secondary">Extraordinary</Badge>}
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={pending || i === 0}
                  onClick={() => move(item.id, "up")}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pending || i === track.items.length - 1}
                  onClick={() => move(item.id, "down")}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <AgendaItemDialog
                  trackId={track.id}
                  item={item}
                  trigger={
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-gray-700"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(item.id)}
                  className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
