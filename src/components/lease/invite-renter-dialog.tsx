"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Copy, CheckCheck } from "lucide-react"
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
import { inviteRenter } from "@/app/actions/lease"

export function InviteRenterDialog({ unitId }: { unitId: string }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await inviteRenter(unitId, {
      email: form.get("email") as string,
      monthlyRent: Number(form.get("monthlyRent")),
      startDate: form.get("startDate") as string,
      endDate: (form.get("endDate") as string) || undefined,
    })
    setSaving(false)
    if (result.success && result.token) {
      const link = `${window.location.origin}/invite/${result.token}`
      setInviteLink(link)
      try {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        toast.success("Invite created and link copied")
      } catch {
        toast.success("Invite created - copy the link below to share it")
      }
    } else {
      setError(result.error || "Failed to create invite")
    }
  }

  async function copyAgain() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy - select and copy the link manually")
    }
  }

  function handleClose(next: boolean) {
    setOpen(next)
    if (!next) {
      setInviteLink(null)
      setError("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={<Button size="sm" />}>Arrange a Rental</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Arrange a Rental</DialogTitle>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Invite created. Share this link with the renter to have them create their account and activate
              the lease.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-600 truncate flex-1">{inviteLink}</p>
              <button onClick={copyAgain} className="text-gray-500 hover:text-gray-900 shrink-0">
                {copied ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Renter&apos;s email</Label>
              <Input name="email" type="email" placeholder="renter@example.com" required />
            </div>
            <div className="space-y-1">
              <Label>Monthly rent</Label>
              <Input name="monthlyRent" type="number" min="0.01" step="0.01" placeholder="0.00" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Lease start</Label>
                <Input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="space-y-1">
                <Label>Lease end (optional)</Label>
                <Input name="endDate" type="date" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" type="button" onClick={() => handleClose(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Invite"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
