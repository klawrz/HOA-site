"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSiblingOrg } from "@/app/actions/org"

export function AddOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { update } = useSession()
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const { orgId } = await createSiblingOrg(name)
      setName("")
      onOpenChange(false)
      await update({ orgId })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setError("")
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add another organization</DialogTitle>
          <DialogDescription>
            Creates a brand-new, fully independent organization under your login - no data is shared
            with your current one. Useful for a separate, legally distinct HOA (e.g. a colocated
            sibling property).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="newOrgName">Organization name</Label>
            <Input
              id="newOrgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sampaguita II"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
