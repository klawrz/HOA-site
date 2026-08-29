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
import { createCustomKeyDate } from "@/app/actions/custom-key-dates"
import { AUDIENCE_ROLES, audienceRoleLabel } from "@/lib/audience"
import type { Role } from "@/generated/prisma"

// Add-only dialog for the general-purpose calendar entries (meetings,
// payment dates, maintenance, inspections) that sit alongside AGM and Dues
// in the Key Dates card - AGM itself is still edited from its own page,
// this is just for everything else. Same audience-targeting UI as
// announcements, deliberately - same underlying convention.
export function NewKeyDateDialog() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allMembers, setAllMembers] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<Set<Role>>(new Set())

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
    const result = await createCustomKeyDate({
      title: form.get("title") as string,
      date: form.get("date") as string,
      time: (form.get("time") as string) || undefined,
      location: (form.get("location") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
      visibleRoles: allMembers ? null : Array.from(selectedRoles),
    })
    setSaving(false)
    if (result.success) {
      toast.success("Key date added")
      setOpen(false)
      setAllMembers(true)
      setSelectedRoles(new Set())
      ;(document.getElementById("new-key-date-form") as HTMLFormElement)?.reset()
    } else {
      toast.error(result.error ?? "Failed to add key date")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>+ Add Key Date</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Key Date</DialogTitle>
        </DialogHeader>
        <form id="new-key-date-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" placeholder="e.g. Roof inspection, Elevator maintenance" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="space-y-1">
              <Label>Time (optional)</Label>
              <Input name="time" type="time" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location (optional)</Label>
            <Input name="location" placeholder="e.g. Clubhouse, Parking level 2" />
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea name="notes" className="h-16 resize-none" placeholder="Anything else members should know" />
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
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || (!allMembers && selectedRoles.size === 0)}>
              {saving ? "Adding..." : "Add Key Date"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
