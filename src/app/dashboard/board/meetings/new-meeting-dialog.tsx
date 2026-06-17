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
import { createMeeting } from "@/app/actions/meetings"

export function NewMeetingDialog() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createMeeting({
      title: form.get("title") as string,
      date: form.get("date") as string,
      location: form.get("location") as string,
      agenda: form.get("agenda") as string,
      attendees: form.get("attendees") as string,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Meeting created")
      setOpen(false)
    } else {
      toast.error("Failed to create meeting")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + New Meeting
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Meeting Title</Label>
            <Input name="title" placeholder="e.g. Monthly Board Meeting" required />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input name="date" type="datetime-local" required />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input name="location" placeholder="e.g. Clubhouse Room A" />
          </div>
          <div className="space-y-1">
            <Label>Agenda</Label>
            <Textarea
              name="agenda"
              placeholder="List agenda items..."
              className="h-24 resize-none"
            />
          </div>
          <div className="space-y-1">
            <Label>Expected Attendees</Label>
            <Input name="attendees" placeholder="Board members, residents..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Meeting"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
