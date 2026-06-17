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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { saveMeetingMinutes } from "@/app/actions/meetings"

interface Meeting {
  id: string
  title: string
  minutes: string | null
}

export function MeetingMinutesDialog({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(meeting.minutes ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await saveMeetingMinutes(meeting.id, minutes)
    setSaving(false)
    if (result.success) {
      toast.success("Minutes saved")
      setOpen(false)
    } else {
      toast.error("Failed to save minutes")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="h-7 text-xs mt-1" />}>
        {meeting.minutes ? "Edit Minutes" : "Add Minutes"}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Meeting Minutes — {meeting.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Minutes</Label>
            <Textarea
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Record meeting minutes here..."
              className="h-64 resize-none font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Minutes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
