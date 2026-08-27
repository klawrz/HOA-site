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
import { Pencil } from "lucide-react"
import { createBoardPosition, updateBoardPosition } from "@/app/actions/board-positions"

interface Member {
  id: string
  name: string | null
  email: string
}

interface RosterOwner {
  id: string
  name: string | null
  email: string | null
  unitNumber: string
}

interface Position {
  id: string
  title: string
  userId: string | null
  userName?: string | null
  userEmail?: string | null
  termStart: Date
  termEnd: Date | null
  notes: string | null
}

function toDateInputValue(d: Date) {
  const date = new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function BoardPositionDialog({
  members,
  rosterOwners = [],
  position,
}: {
  members: Member[]
  rosterOwners?: RosterOwner[]
  position?: Position
}) {
  const isEdit = !!position
  // A holder whose userId isn't in the picker's member list was set via
  // direct name/email entry (a placeholder, not yet an actual portal
  // member) - prefill the text fields instead of the dropdown for them.
  const isPlaceholderHolder = !!position?.userId && !members.some((m) => m.id === position.userId)
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState(isPlaceholderHolder ? "" : position?.userId ?? "")
  const [holderName, setHolderName] = useState(isPlaceholderHolder ? position?.userName ?? "" : "")
  const [holderEmail, setHolderEmail] = useState(isPlaceholderHolder ? position?.userEmail ?? "" : "")
  const [rosterPickId, setRosterPickId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const memberItems: Record<string, string> = { "": "Vacant" }
  for (const m of members) memberItems[m.id] = m.name ?? m.email

  const rosterItems: Record<string, string> = { "": "Choose from your Owner Roster..." }
  for (const o of rosterOwners) rosterItems[o.id] = `${o.name ?? o.email ?? "Unnamed"} — Unit ${o.unitNumber}`

  // Picking a staged/imported owner just fills in the same "record a holder
  // directly" fields below (name/email as free text) - this owner isn't a
  // real portal member yet (see PendingOwner in schema.prisma), so there's
  // no userId to assign, only their name/contact to save re-typing it.
  function handleRosterPick(id: string) {
    setRosterPickId(id)
    const owner = rosterOwners.find((o) => o.id === id)
    if (owner) {
      setUserId("")
      setHolderName(owner.name ?? "")
      setHolderEmail(owner.email ?? "")
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const data = {
      title: form.get("title") as string,
      // A directly-typed name/email (for a seat not yet held by an existing
      // portal member) takes priority over whatever's picked in the dropdown.
      userId: holderEmail.trim() ? undefined : userId || undefined,
      holderName: holderName || undefined,
      holderEmail: holderEmail || undefined,
      termStart: form.get("termStart") as string,
      termEnd: (form.get("termEnd") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    }

    const result = isEdit ? await updateBoardPosition(position.id, data) : await createBoardPosition(data)
    setSaving(false)
    if (result.success) {
      toast.success(isEdit ? "Position updated" : "Position added")
      setOpen(false)
      if (!isEdit) {
        setUserId("")
        setHolderName("")
        setHolderEmail("")
        setRosterPickId("")
        ;(document.getElementById("board-position-form-new") as HTMLFormElement)?.reset()
      }
    } else {
      setError(result.error ?? "Failed to save")
      toast.error(result.error ?? "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <button className="text-gray-400 hover:text-blue-500 transition-colors" />
          ) : (
            <Button />
          )
        }
      >
        {isEdit ? <Pencil className="h-3.5 w-3.5" /> : "+ Add Position"}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Board Position" : "Add Board Position"}</DialogTitle>
        </DialogHeader>
        <form
          id={`board-position-form-${isEdit ? position.id : "new"}`}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              name="title"
              placeholder="e.g. President, Treasurer, Member at Large"
              defaultValue={position?.title}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Holder (existing member)</Label>
            <Select value={userId} onValueChange={(v) => setUserId(v ?? "")} items={memberItems}>
              <SelectTrigger>
                <SelectValue placeholder="Vacant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Vacant</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Assigning someone here also grants them Board governance access, if they don&apos;t already
              have it.
            </p>
          </div>
          <div className="space-y-1 border-t pt-3">
            <Label>Or record a holder directly</Label>
            {rosterOwners.length > 0 && (
              <Select value={rosterPickId} onValueChange={(v) => handleRosterPick(v ?? "")} items={rosterItems}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose from your Owner Roster..." />
                </SelectTrigger>
                <SelectContent>
                  {rosterOwners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name ?? o.email ?? "Unnamed"} — Unit {o.unitNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input
                name="holderName"
                placeholder="Name"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
              />
              <Input
                name="holderEmail"
                type="email"
                placeholder="Email"
                value={holderEmail}
                onChange={(e) => setHolderEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400">
              For a seat held by someone not yet in HOPE - they get real portal access later via an
              invite. If filled in, this takes priority over the dropdown above.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Term Start</Label>
              <Input
                name="termStart"
                type="date"
                required
                defaultValue={position ? toDateInputValue(position.termStart) : undefined}
              />
            </div>
            <div className="space-y-1">
              <Label>Term End (optional)</Label>
              <Input
                name="termEnd"
                type="date"
                defaultValue={position?.termEnd ? toDateInputValue(position.termEnd) : undefined}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea
              name="notes"
              placeholder="Election details, responsibilities, etc."
              className="h-16 resize-none"
              defaultValue={position?.notes ?? undefined}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Position"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
