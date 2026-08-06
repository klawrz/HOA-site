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
import { Textarea } from "@/components/ui/textarea"
import { Pencil, User as UserIcon, X } from "lucide-react"
import { updateUnit, assignUnitOwner, clearUnitOwner } from "@/app/actions/org"

type Unit = {
  id: string
  number: string
  building: string | null
  floor: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  description: string | null
  civicRoll: string | null
  owner: { name: string | null; email: string } | null
}

export function EditUnitDialog({ unit, unitLabel }: { unit: Unit; unitLabel: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [owner, setOwner] = useState(unit.owner)
  const [ownerName, setOwnerName] = useState(unit.owner?.name ?? "")
  const [ownerEmail, setOwnerEmail] = useState(unit.owner?.email ?? "")
  const [ownerSaving, setOwnerSaving] = useState(false)
  const [ownerError, setOwnerError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    try {
      await updateUnit(unit.id, new FormData(e.currentTarget))
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    }
  }

  async function handleAssignOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setOwnerError("")
    setOwnerSaving(true)
    try {
      await assignUnitOwner(unit.id, { name: ownerName, email: ownerEmail })
      setOwner({ name: ownerName.trim() || null, email: ownerEmail.trim().toLowerCase() })
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setOwnerSaving(false)
    }
  }

  async function handleClearOwner() {
    setOwnerError("")
    setOwnerSaving(true)
    try {
      await clearUnitOwner(unit.id)
      setOwner(null)
      setOwnerName("")
      setOwnerEmail("")
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : "Failed to remove")
    } finally {
      setOwnerSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {unitLabel} {unit.number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{unitLabel} Number *</Label>
              <Input name="number" defaultValue={unit.number} required />
            </div>
            <div className="space-y-1">
              <Label>Building</Label>
              <Input name="building" defaultValue={unit.building ?? ""} placeholder="Building A" />
            </div>
            <div className="space-y-1">
              <Label>Floor</Label>
              <Input name="floor" type="number" defaultValue={unit.floor ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Sqft</Label>
              <Input name="sqft" type="number" min="0" defaultValue={unit.sqft ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Bedrooms</Label>
              <Input name="bedrooms" type="number" min="0" defaultValue={unit.bedrooms ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Bathrooms</Label>
              <Input name="bathrooms" type="number" step="0.5" min="0" defaultValue={unit.bathrooms ?? ""} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea name="description" defaultValue={unit.description ?? ""} className="h-20" />
          </div>
          <div className="space-y-1">
            <Label>Civic Roll Number</Label>
            <Input name="civicRoll" defaultValue={unit.civicRoll ?? ""} placeholder="Municipal assessment/civic roll number" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>

        {/* Separate form from the fields above - a nested <form> isn't
            valid HTML, and this saves independently via its own action
            rather than as part of the unit-details Save button. */}
        <form onSubmit={handleAssignOwner} className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <UserIcon className="h-3.5 w-3.5" /> Owner
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Owner name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                required
              />
            </div>
          </div>
          {ownerError && <p className="text-sm text-red-600">{ownerError}</p>}
          <div className="flex items-center justify-between">
            {owner ? (
              <button
                type="button"
                onClick={handleClearOwner}
                disabled={ownerSaving}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <X className="h-3 w-3" /> Remove owner
              </button>
            ) : (
              <span />
            )}
            <Button type="submit" size="sm" variant="outline" disabled={ownerSaving}>
              {owner ? "Update Owner" : "Assign Owner"}
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Records the owner of record directly. If they don&apos;t have a HOPE account yet, send them
            an invite separately from Send Invites to give them portal access.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
