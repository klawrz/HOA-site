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
import { createPMContract } from "@/app/actions/pm"

interface CompanyOption {
  id: string
  legalName: string
}

export function NewPMContractDialog({ companies }: { companies: CompanyOption[] }) {
  const [open, setOpen] = useState(false)
  const [companyId, setCompanyId] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await createPMContract({
      companyId,
      startDate: form.get("startDate") as string,
      endDate: (form.get("endDate") as string) || undefined,
      terms: (form.get("terms") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Property manager contracted")
      setOpen(false)
    } else {
      toast.error("Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>+ New Contract</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contract a Property Manager</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Property Management Company</Label>
            <Select
              value={companyId}
              onValueChange={(v) => setCompanyId(v ?? "")}
              items={Object.fromEntries(companies.map((c) => [c.id, c.legalName]))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.legalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companies.length === 0 && (
              <p className="text-xs text-gray-400">
                No property management companies are registered yet - ask them to create a
                company profile from their Property Manager account first.
              </p>
            )}
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
            <Label>Terms</Label>
            <Textarea name="terms" placeholder="Scope of services, fees, notes..." className="h-20 resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !companyId}>
              {saving ? "Saving..." : "Save Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
