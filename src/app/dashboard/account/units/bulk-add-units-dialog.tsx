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
import { Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { bulkAddUnits } from "@/app/actions/org"

type Mode = "floor" | "paste"
type PendingUnit = { number: string; floor?: number; building?: string }

export function BulkAddUnitsDialog({ unitLabel }: { unitLabel: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("floor")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const [startFloor, setStartFloor] = useState("1")
  const [numFloors, setNumFloors] = useState("1")
  const [unitsPerFloor, setUnitsPerFloor] = useState("10")
  const [padDigits, setPadDigits] = useState("2")
  const [floorBuilding, setFloorBuilding] = useState("")

  const [pasteText, setPasteText] = useState("")
  const [pasteBuilding, setPasteBuilding] = useState("")

  function generateByFloor(): PendingUnit[] {
    const start = Number(startFloor) || 1
    const floors = Math.max(1, Number(numFloors) || 1)
    const perFloor = Math.max(1, Number(unitsPerFloor) || 1)
    const pad = Math.max(1, Number(padDigits) || 2)
    const units: PendingUnit[] = []
    for (let f = start; f < start + floors; f++) {
      for (let i = 1; i <= perFloor; i++) {
        units.push({ number: `${f}${String(i).padStart(pad, "0")}`, floor: f, building: floorBuilding || undefined })
      }
    }
    return units
  }

  function generateFromPaste(): PendingUnit[] {
    return pasteText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((number) => ({ number, building: pasteBuilding || undefined }))
  }

  const preview = mode === "floor" ? generateByFloor() : generateFromPaste()

  async function handleSubmit() {
    setError("")
    if (preview.length === 0) {
      setError("Nothing to add yet")
      return
    }
    setSaving(true)
    try {
      const result = await bulkAddUnits(preview)
      const skippedNote = result.skipped.length > 0 ? `, skipped ${result.skipped.length} already on file (${result.skipped.join(", ")})` : ""
      toast.success(`Added ${result.created} ${unitLabel.toLowerCase()}${result.created === 1 ? "" : "s"}${skippedNote}`)
      setOpen(false)
      setPasteText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add units")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Layers className="h-4 w-4" /> Bulk Add
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk add {unitLabel.toLowerCase()}s</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-3">
          <button
            type="button"
            onClick={() => setMode("floor")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg",
              mode === "floor" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}
          >
            By floor
          </button>
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg",
              mode === "paste" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
            )}
          >
            Paste a list
          </button>
        </div>

        {mode === "floor" ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Generates apartment-style numbers, e.g. floor 1 → 101, 102... floor 2 → 201, 202...
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Starting floor</Label>
                <Input type="number" value={startFloor} onChange={(e) => setStartFloor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Number of floors</Label>
                <Input type="number" min="1" value={numFloors} onChange={(e) => setNumFloors(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{unitLabel}s per floor</Label>
                <Input type="number" min="1" value={unitsPerFloor} onChange={(e) => setUnitsPerFloor(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Number digits</Label>
                <Input type="number" min="1" value={padDigits} onChange={(e) => setPadDigits(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Building (optional, applies to all)</Label>
              <Input value={floorBuilding} onChange={(e) => setFloorBuilding(e.target.value)} placeholder="Building A" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              One number per line - handles any numbering scheme (Villa-1, 1A, B2...).
            </p>
            <div className="space-y-1">
              <Label>Unit numbers</Label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"Villa-1\nVilla-2\nVilla-3"}
                className="h-32"
              />
            </div>
            <div className="space-y-1">
              <Label>Building (optional, applies to all)</Label>
              <Input value={pasteBuilding} onChange={(e) => setPasteBuilding(e.target.value)} />
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">
          {preview.length} {unitLabel.toLowerCase()}{preview.length === 1 ? "" : "s"} will be created
          {preview.length > 0 ? ` (${preview[0].number}${preview.length > 1 ? ` … ${preview[preview.length - 1].number}` : ""})` : ""}.
          Everything else (bedrooms, bathrooms, sqft...) can be filled in afterward from Edit.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || preview.length === 0}>
            {saving ? "Adding..." : `Add ${preview.length || ""} ${unitLabel}${preview.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
