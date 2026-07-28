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
import { ContractType } from "@/generated/prisma"
import { contractTypeLabel } from "@/lib/contract-styles"
import { contractorCategoryLabel } from "@/lib/contractor-styles"
import { createPropertyContract, createUnitContract } from "@/app/actions/contracts"

interface Contractor {
  id: string
  name: string | null
  email: string
  company: string | null
  category: string | null
}

const types = Object.keys(contractTypeLabel) as ContractType[]

function contractorLabel(c: Contractor) {
  const category = c.category ? contractorCategoryLabel[c.category] : null
  const name = c.name ?? c.email
  const company = c.company ? ` (${c.company})` : ""
  return category ? `${category} — ${name}${company}` : `${name}${company}`
}

type Props = ({ scope: "property"; orgId: string } | { scope: "unit"; unitId: string }) & {
  contractors: Contractor[]
}

export function NewContractDialog(props: Props) {
  const { contractors, scope } = props
  const [open, setOpen] = useState(false)
  const [contractorId, setContractorId] = useState("")
  const [type, setType] = useState<ContractType>("PROJECT")
  const [saving, setSaving] = useState(false)

  const sortedContractors = [...contractors].sort((a, b) => {
    const catA = a.category ?? "￿"
    const catB = b.category ?? "￿"
    if (catA !== catB) return catA.localeCompare(catB)
    return (a.name ?? a.email).localeCompare(b.name ?? b.email)
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!contractorId) return
    setSaving(true)
    const form = new FormData(e.currentTarget)
    form.set("type", type)
    form.set("contractorId", contractorId)
    const uploadedFile = form.get("file")
    if (uploadedFile instanceof File && uploadedFile.size === 0) form.delete("file")

    const result =
      props.scope === "property"
        ? await createPropertyContract(props.orgId, form)
        : await createUnitContract(props.unitId, form)
    setSaving(false)
    if (result.success) {
      toast.success("Contract created")
      setOpen(false)
      setContractorId("")
      setType("PROJECT")
      ;(document.getElementById(`contract-form-${scope}`) as HTMLFormElement)?.reset()
    } else {
      toast.error(result.error ?? "Failed to create contract")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>+ New Contract</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Contract</DialogTitle>
        </DialogHeader>
        <form id={`contract-form-${scope}`} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Contract Title</Label>
            <Input name="title" placeholder="e.g. Landscaping Services 2026" required />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ContractType)} items={contractTypeLabel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {contractTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Recurring: ongoing services/utilities. Project: one-off work. Critical: insurance or
              government/regulatory - highlighted and expiry-tracked.
            </p>
          </div>
          <div className="space-y-1">
            <Label>Contractor</Label>
            <Select
              value={contractorId}
              onValueChange={(v) => setContractorId(v ?? "")}
              required
              items={Object.fromEntries(sortedContractors.map((c) => [c.id, contractorLabel(c)]))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contractor" />
              </SelectTrigger>
              <SelectContent>
                {sortedContractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {contractorLabel(c)}
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
          {type === "CRITICAL" && (
            <div className="space-y-1">
              <Label>Remind me (days before expiry)</Label>
              <Input name="reminderDaysBefore" type="number" min="0" placeholder="30" />
            </div>
          )}
          <div className="space-y-1">
            <Label>Amount ($)</Label>
            <Input name="amount" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea name="description" placeholder="Scope of work..." className="h-20 resize-none" />
          </div>
          <div className="space-y-1">
            <Label>Upload Contract File (optional)</Label>
            <Input name="file" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
          </div>
          <div className="space-y-1">
            <Label>Or Link to File (optional)</Label>
            <Input name="fileUrl" type="url" placeholder="https://..." />
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
