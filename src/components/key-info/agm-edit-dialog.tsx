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
import { upsertAgmKeyDate } from "@/app/actions/key-dates"

type ExistingAgm = {
  date: string // yyyy-mm-dd
  time: string // HH:mm
  location: string
  chairpersonName: string
  agenda: string
  proxyProcess: string
  notes: string
}

export function AgmEditDialog({ existing }: { existing?: ExistingAgm }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const uploadedFile = form.get("file")
    if (uploadedFile instanceof File && uploadedFile.size === 0) form.delete("file")

    const result = await upsertAgmKeyDate(form)
    setSaving(false)
    if (result.success) {
      toast.success("AGM details saved")
      setOpen(false)
    } else {
      setError(result.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        {existing ? "Edit AGM Details" : "Set Up AGM"}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Annual General Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="date" type="date" defaultValue={existing?.date} required />
            </div>
            <div className="space-y-1">
              <Label>Time</Label>
              <Input name="time" type="time" defaultValue={existing?.time} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input name="location" placeholder="e.g. Clubhouse, or a video call link" defaultValue={existing?.location} />
          </div>
          <div className="space-y-1">
            <Label>Chairperson</Label>
            <Input name="chairpersonName" placeholder="Who's chairing the meeting" defaultValue={existing?.chairpersonName} />
          </div>
          <div className="space-y-1">
            <Label>Agenda</Label>
            <Textarea name="agenda" placeholder="Agenda items, one per line" className="h-24 text-sm" defaultValue={existing?.agenda} />
          </div>
          <div className="space-y-1">
            <Label>Proxy Process</Label>
            <Textarea
              name="proxyProcess"
              placeholder="How an owner who can't attend assigns a proxy"
              className="h-20 text-sm"
              defaultValue={existing?.proxyProcess}
            />
          </div>
          <div className="space-y-1">
            <Label>Proxy Form (optional)</Label>
            <Input name="file" type="file" accept=".pdf,.doc,.docx" />
          </div>
          <div className="space-y-1">
            <Label>Other Notes</Label>
            <Textarea name="notes" className="h-16 text-sm" defaultValue={existing?.notes} />
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
