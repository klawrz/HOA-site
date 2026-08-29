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
import { Pencil } from "lucide-react"
import { createAnnouncement, updateAnnouncement } from "@/app/actions/announcements"
import { AUDIENCE_ROLES, audienceRoleLabel, parseVisibleRoles } from "@/lib/audience"
import type { Role } from "@/generated/prisma"

type ExistingAnnouncement = {
  id: string
  title: string
  content: string
  visibleRoles: string | null
  removeAfter: Date | null
  postOn: Date | null
}

// Handles both create ("+ Post Announcement") and edit (pencil icon on an
// existing row) - same form either way, just a different action call and
// trigger. Editing reuses createAnnouncement's exact validation/shape via
// updateAnnouncement, added 2026-08-28 alongside "Post On" per Dara
// ("thinking of actual situations" - scheduling ahead and fixing typos
// after the fact are both real, common needs, not edge cases).
export function NewAnnouncementDialog({ existing }: { existing?: ExistingAnnouncement }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const initialRoles = existing ? parseVisibleRoles(existing.visibleRoles) : null
  const [allMembers, setAllMembers] = useState(!initialRoles)
  const [selectedRoles, setSelectedRoles] = useState<Set<Role>>(new Set(initialRoles ?? []))

  function toggleRole(role: Role) {
    setSelectedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      title: form.get("title") as string,
      content: form.get("content") as string,
      visibleRoles: allMembers ? null : Array.from(selectedRoles),
      removeAfter: (form.get("removeAfter") as string) || null,
      postOn: (form.get("postOn") as string) || null,
    }
    const result = existing ? await updateAnnouncement(existing.id, payload) : await createAnnouncement(payload)
    setSaving(false)
    if (result.success) {
      toast.success(existing ? "Announcement updated" : "Announcement posted")
      setOpen(false)
      if (!existing) {
        setAllMembers(true)
        setSelectedRoles(new Set())
        ;(document.getElementById(formId) as HTMLFormElement)?.reset()
      }
    } else {
      toast.error(result.error ?? `Failed to ${existing ? "update" : "post"} announcement`)
    }
  }

  const formId = existing ? `edit-announcement-form-${existing.id}` : "new-announcement-form"
  const toDateInputValue = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          existing ? (
            <button className="text-gray-400 hover:text-gray-700 transition-colors shrink-0 p-1" title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Button>+ Post Announcement</Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Announcement" : "Post Announcement"}</DialogTitle>
        </DialogHeader>
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              name="title"
              placeholder="e.g. Pool closed for maintenance July 30"
              defaultValue={existing?.title}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Details</Label>
            <Textarea
              name="content"
              placeholder="What members need to know..."
              className="h-32 resize-none"
              defaultValue={existing?.content}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Who should see this?</Label>
            <label className="flex items-center gap-2 text-sm bg-gray-50 border rounded-lg px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-gray-900"
                checked={allMembers}
                onChange={(e) => setAllMembers(e.target.checked)}
              />
              All members
            </label>
            {!allMembers && (
              <div className="grid grid-cols-2 gap-1.5 pl-1">
                {AUDIENCE_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-gray-900"
                      checked={selectedRoles.has(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {audienceRoleLabel[role]}
                  </label>
                ))}
              </div>
            )}
            {!allMembers && selectedRoles.size === 0 && (
              <p className="text-xs text-amber-600">Pick at least one role, or check &quot;All members&quot;.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Post on (optional)</Label>
              <Input name="postOn" type="date" defaultValue={toDateInputValue(existing?.postOn ?? null)} />
              <p className="text-xs text-gray-400">Blank posts immediately.</p>
            </div>
            <div className="space-y-1">
              <Label>Remove after (optional)</Label>
              <Input name="removeAfter" type="date" defaultValue={toDateInputValue(existing?.removeAfter ?? null)} />
              <p className="text-xs text-gray-400">Blank stays until removed.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (!allMembers && selectedRoles.size === 0)}>
              {saving ? "Saving..." : existing ? "Save Changes" : "Post Announcement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
