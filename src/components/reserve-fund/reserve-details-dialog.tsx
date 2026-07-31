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
import { setReserveDetails } from "@/app/actions/reserve-fund"

export function ReserveDetailsDialog({
  currentTarget,
  currentPolicy,
  currentHeldAt,
}: {
  currentTarget: number | null
  currentPolicy: string | null
  currentHeldAt: string | null
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const rawTarget = form.get("target") as string
    const result = await setReserveDetails({
      target: rawTarget.trim() === "" ? null : Number(rawTarget),
      policy: (form.get("policy") as string) ?? "",
      heldAt: (form.get("heldAt") as string) ?? "",
    })
    setSaving(false)
    if (result.success) {
      toast.success("Reserve fund details updated")
      setOpen(false)
    } else {
      setError(result.error || "Failed to update reserve fund details")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit Details</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve Fund Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Board-approved target amount</Label>
            <Input
              key={currentTarget}
              name="target"
              type="number"
              min="0"
              step="0.01"
              defaultValue={currentTarget ?? undefined}
              placeholder="e.g. 100000"
            />
          </div>
          <div className="space-y-1">
            <Label>Held at</Label>
            <Input
              key={currentHeldAt}
              name="heldAt"
              placeholder="e.g. Bank of America - Reserve Acct #1234"
              defaultValue={currentHeldAt ?? undefined}
            />
          </div>
          <div className="space-y-1">
            <Label>Reserve fund policy</Label>
            <Textarea
              key={currentPolicy}
              name="policy"
              placeholder="Funding and use policy in the Board's own words - e.g. how it's funded, when withdrawals are allowed, minimum balance rules..."
              className="h-24 resize-none"
              defaultValue={currentPolicy ?? undefined}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
