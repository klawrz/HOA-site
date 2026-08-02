"use client"

import { useState } from "react"
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
import { Pencil } from "lucide-react"
import { updateUnit } from "@/app/actions/org"

type Unit = {
  id: string
  number: string
  building: string | null
  floor: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  description: string | null
  civicRoll: string | null
}

export function EditUnitDialog({ unit, unitLabel }: { unit: Unit; unitLabel: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    try {
      await updateUnit(unit.id, new FormData(e.currentTarget))
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {unitLabel} {unit.number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{unitLabel} Number *</Label>
              <Input name="number" defaultValue={unit.number} required />
            </div>
            <div className="space-y-1">
              <Label>Building</Label>
              <Input name="building" defaultValue={unit.building ?? ""} placeholder="Building A" />
            </div>
            <div className="space-y-1">
              <Label>Floor</Label>
              <Input name="floor" type="number" defaultValue={unit.floor ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Sqft</Label>
              <Input name="sqft" type="number" min="0" defaultValue={unit.sqft ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Bedrooms</Label>
              <Input name="bedrooms" type="number" min="0" defaultValue={unit.bedrooms ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Bathrooms</Label>
              <Input name="bathrooms" type="number" step="0.5" min="0" defaultValue={unit.bathrooms ?? ""} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea name="description" defaultValue={unit.description ?? ""} className="h-20" />
          </div>
          <div className="space-y-1">
            <Label>Civic Roll Number</Label>
            <Input name="civicRoll" defaultValue={unit.civicRoll ?? ""} placeholder="Municipal assessment/civic roll number" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
