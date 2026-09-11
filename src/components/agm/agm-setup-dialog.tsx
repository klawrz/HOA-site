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
import { ensureAgm } from "@/app/actions/agm"

export function AgmSetupDialog({ defaultYear }: { defaultYear: number }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const result = await ensureAgm(new FormData(e.currentTarget))
    setSaving(false)
    if (result.success) {
      toast.success("AGM created - both tracks and their default agendas are ready to edit")
      setOpen(false)
    } else {
      setError(result.error || "Failed to create AGM")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Set up the AGM</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set up the Annual General Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-gray-500">
            Creates both legal tracks — the Condominium Regime assembly and the Civil Association
            assembly — each with the standard bilingual agenda ready to adjust.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Year</Label>
              <Input name="year" type="number" defaultValue={defaultYear} required />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="space-y-1">
              <Label>Time</Label>
              <Input name="time" type="time" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Call times</Label>
            <Input
              name="callTimes"
              placeholder="e.g. 2:00 pm first call / 2:15 pm second call"
            />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input name="location" placeholder="e.g. Associa Meeting Room, San José del Cabo" />
          </div>
          <div className="space-y-1">
            <Label>Chairperson</Label>
            <Input name="chairpersonName" placeholder="Who signs the notice / chairs the meeting" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create AGM"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
