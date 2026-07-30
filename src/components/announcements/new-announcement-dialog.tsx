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
import { createAnnouncement } from "@/app/actions/announcements"

export function NewAnnouncementDialog() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createAnnouncement({
      title: form.get("title") as string,
      content: form.get("content") as string,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Announcement posted")
      setOpen(false)
      ;(document.getElementById("new-announcement-form") as HTMLFormElement)?.reset()
    } else {
      toast.error(result.error ?? "Failed to post announcement")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>+ Post Announcement</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Post Announcement</DialogTitle>
        </DialogHeader>
        <form id="new-announcement-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" placeholder="e.g. Pool closed for maintenance July 30" required />
          </div>
          <div className="space-y-1">
            <Label>Details</Label>
            <Textarea
              name="content"
              placeholder="What Owners need to know..."
              className="h-32 resize-none"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Posting..." : "Post Announcement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
