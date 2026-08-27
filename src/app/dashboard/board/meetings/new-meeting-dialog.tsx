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
import { createMeeting } from "@/app/actions/meetings"
import type { MeetingType } from "@/generated/prisma"

const meetingTypeLabel: Record<MeetingType, string> = {
  AGM: "Annual General Meeting (AGM)",
  DUES: "Dues Meeting",
  OTHER: "Other",
}
const meetingTypes = Object.keys(meetingTypeLabel) as MeetingType[]

export function NewMeetingDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<MeetingType>("OTHER")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createMeeting({
      title: form.get("title") as string,
      type,
      date: form.get("date") as string,
      location: form.get("location") as string,
      agenda: form.get("agenda") as string,
      attendees: form.get("attendees") as string,
    })
    setSaving(false)
    if (result.success) {
      toast.success(
        type === "AGM"
          ? "AGM created - add the chairperson, proxy process, and other AGM details from its own page"
          : "Meeting created"
      )
      setOpen(false)
      setType("OTHER")
      ;(document.getElementById("new-meeting-form") as HTMLFormElement)?.reset()
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
        <form id="new-meeting-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as MeetingType)} items={meetingTypeLabel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meetingTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {meetingTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {type === "AGM" && (
              <p className="text-xs text-gray-500">
                Creates the AGM and links it to its own page for the chairperson, proxy process/form,
                and agenda - fill those in there right after.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Meeting Title</Label>
            <Input
              name="title"
              placeholder={type === "AGM" ? "Annual General Meeting" : "e.g. Monthly Board Meeting"}
              defaultValue={type === "AGM" ? "Annual General Meeting" : undefined}
              key={type}
              required
            />
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
