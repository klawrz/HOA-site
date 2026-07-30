"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/app/actions/password"

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const form = new FormData(e.currentTarget)
    const current = form.get("current") as string
    const next = form.get("next") as string
    const confirm = form.get("confirm") as string
    if (next !== confirm) {
      setError("New passwords don't match")
      return
    }
    setSaving(true)
    const result = await changePassword(current, next)
    setSaving(false)
    if (result.success) {
      toast.success("Password changed")
      onOpenChange(false)
    } else {
      setError(result.error || "Failed to change password")
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
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Current password</Label>
            <Input name="current" type="password" required />
          </div>
          <div className="space-y-1">
            <Label>New password</Label>
            <Input name="next" type="password" minLength={8} required />
          </div>
          <div className="space-y-1">
            <Label>Confirm new password</Label>
            <Input name="confirm" type="password" minLength={8} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Change Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
