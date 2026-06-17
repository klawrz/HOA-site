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
import { createContract } from "@/app/actions/contracts"

interface Contractor {
  id: string
  name: string | null
  email: string
  company: string | null
}

export function NewContractDialog({ contractors }: { contractors: Contractor[] }) {
  const [open, setOpen] = useState(false)
  const [contractorId, setContractorId] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contractorId) return
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createContract({
      title: form.get("title") as string,
      contractorId,
      startDate: form.get("startDate") as string,
      endDate: form.get("endDate") as string,
      amount: form.get("amount") as string,
      description: form.get("description") as string,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Contract created")
      setOpen(false)
    } else {
      toast.error("Failed to create contract")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + New Contract
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Contract Title</Label>
            <Input name="title" placeholder="e.g. Landscaping Services 2025" required />
          </div>
          <div className="space-y-1">
            <Label>Contractor</Label>
            <Select value={contractorId} onValueChange={(v) => setContractorId(v ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Select contractor" />
              </SelectTrigger>
              <SelectContent>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name ?? c.email}
                    {c.company && ` (${c.company})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input name="startDate" type="date" required />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input name="endDate" type="date" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Amount ($)</Label>
            <Input name="amount" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea name="description" placeholder="Scope of work..." className="h-20 resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !contractorId}>
              {saving ? "Creating..." : "Create Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
