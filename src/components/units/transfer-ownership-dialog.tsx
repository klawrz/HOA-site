"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowRightLeft } from "lucide-react"
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
import { proposeOwnershipTransfer } from "@/app/actions/unit-ownership"

export function TransferOwnershipDialog({
  unitId,
  unitDisplay,
  currentOwnerName,
}: {
  unitId: string
  unitDisplay: string
  currentOwnerName: string | null
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await proposeOwnershipTransfer({
      unitId,
      newOwnerEmail: form.get("email") as string,
      newOwnerName: form.get("name") as string,
      since: form.get("since") as string,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Transfer proposed - waiting on confirmation")
      setOpen(false)
    } else {
      setError(result.error || "Failed to propose transfer")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowRightLeft className="h-3 w-3" /> Transfer
          </button>
        }
      />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Propose Ownership Transfer - {unitDisplay}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {currentOwnerName && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Currently owned by <span className="font-medium">{currentOwnerName}</span> - proposing a
              transfer won&apos;t change anything yet. Every current owner must confirm they&apos;re
              divesting, and the new owner must confirm by accepting their invite, before ownership
              actually moves.
            </p>
          )}
          <div className="space-y-1">
            <Label>New Owner&apos;s Name</Label>
            <Input name="name" placeholder="e.g. Jane Ellmann" required />
          </div>
          <div className="space-y-1">
            <Label>New Owner&apos;s Email</Label>
            <Input name="email" type="email" placeholder="owner@example.com" required />
            <p className="text-xs text-gray-400">
              They&apos;ll get an invite to confirm - nothing changes until they accept it.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Owned Since</Label>
            <Input name="since" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Proposing..." : "Propose Transfer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
