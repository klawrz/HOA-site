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
import { Plus } from "lucide-react"
import { addUnit } from "@/app/actions/org"

export function NewUnitDialog({ unitLabel }: { unitLabel: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    try {
      await addUnit(new FormData(e.currentTarget))
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add unit")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" /> Add {unitLabel}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a {unitLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{unitLabel} Number *</Label>
              <Input name="number" placeholder="1A" required />
            </div>
            <div className="space-y-1">
              <Label>Building</Label>
              <Input name="building" placeholder="Building A" />
            </div>
            <div className="space-y-1">
              <Label>Bedrooms</Label>
              <Input name="bedrooms" type="number" min="0" placeholder="2" />
            </div>
            <div className="space-y-1">
              <Label>Bathrooms</Label>
              <Input name="bathrooms" type="number" step="0.5" min="0" placeholder="1.5" />
            </div>
            <div className="space-y-1">
              <Label>Sqft</Label>
              <Input name="sqft" type="number" min="0" placeholder="950" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Civic Roll Number</Label>
            <Input name="civicRoll" placeholder="Municipal assessment/civic roll number" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add {unitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
