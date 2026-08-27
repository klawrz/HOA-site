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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createReserveCapitalItem, updateReserveCapitalItem } from "@/app/actions/reserve-capital-items"

// Preset item list per Dara - same "preset dropdown + Other free-text"
// pattern as the unit-label picker in the onboarding wizard, so a
// custodian isn't stuck if the real item isn't one of these.
export const CAPITAL_ITEM_PRESETS = [
  "Pool Rework",
  "Main Gas Tank Replacement",
  "Gates Replacement",
  "Roof Replacements",
  "Electrical Work",
  "Pool Furniture",
]
const OTHER_VALUE = "__other__"

type ExistingItem = {
  id: string
  name: string
  lastDone: string // yyyy-mm-dd
  lifeExpectancyYears: number
  estimatedCost: number | null
  notes: string
}

export function CapitalItemDialog({ existing, trigger }: { existing?: ExistingItem; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const initialIsPreset = existing ? CAPITAL_ITEM_PRESETS.includes(existing.name) : true
  const [selectValue, setSelectValue] = useState(
    existing ? (initialIsPreset ? existing.name : OTHER_VALUE) : CAPITAL_ITEM_PRESETS[0]
  )
  const [customName, setCustomName] = useState(existing && !initialIsPreset ? existing.name : "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const form = new FormData(e.currentTarget)
    const name = selectValue === OTHER_VALUE ? customName.trim() : selectValue
    if (!name) {
      setError("Item name required")
      return
    }
    const costRaw = form.get("estimatedCost") as string
    setSaving(true)
    const data = {
      name,
      lastDone: form.get("lastDone") as string,
      lifeExpectancyYears: Number(form.get("lifeExpectancyYears")),
      estimatedCost: costRaw ? Number(costRaw) : null,
      notes: (form.get("notes") as string) ?? "",
    }
    const result = existing
      ? await updateReserveCapitalItem(existing.id, data)
      : await createReserveCapitalItem(data)
    setSaving(false)
    if (result.success) {
      toast.success(existing ? "Item updated" : "Item added")
      setOpen(false)
    } else {
      setError(result.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? (trigger as React.ReactElement) : <Button size="sm">+ Add Item</Button>} />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Long-Term Item" : "Add Long-Term Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Item</Label>
            <Select
              value={selectValue}
              onValueChange={(v) => setSelectValue(v ?? CAPITAL_ITEM_PRESETS[0])}
              items={{
                ...Object.fromEntries(CAPITAL_ITEM_PRESETS.map((p) => [p, p])),
                [OTHER_VALUE]: "Other",
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAPITAL_ITEM_PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                <SelectItem value={OTHER_VALUE}>Other</SelectItem>
              </SelectContent>
            </Select>
            {selectValue === OTHER_VALUE && (
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Describe the item"
                className="mt-1"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Last Done</Label>
              <Input name="lastDone" type="date" defaultValue={existing?.lastDone} required />
            </div>
            <div className="space-y-1">
              <Label>Life Expectancy (yrs)</Label>
              <Input
                name="lifeExpectancyYears"
                type="number"
                min="1"
                step="1"
                defaultValue={existing?.lifeExpectancyYears}
                placeholder="e.g. 15"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Estimated Replacement Cost</Label>
            <Input
              name="estimatedCost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={existing?.estimatedCost ?? ""}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea name="notes" defaultValue={existing?.notes} placeholder="Optional" rows={2} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
