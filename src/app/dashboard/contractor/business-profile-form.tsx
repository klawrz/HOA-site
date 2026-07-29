"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ContractorCategory } from "@/generated/prisma"
import { contractorCategoryLabel } from "@/lib/contractor-styles"
import { updateContractorProfile } from "@/app/actions/contractor-profile"

const categories = Object.keys(contractorCategoryLabel) as ContractorCategory[]

export function BusinessProfileForm({
  company,
  phone,
  category,
}: {
  company: string | null
  phone: string | null
  category: ContractorCategory | null
}) {
  const [selectedCategory, setSelectedCategory] = useState<ContractorCategory | "">(category ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await updateContractorProfile({
      company: (form.get("company") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      category: selectedCategory || undefined,
    })
    setSaving(false)
    if (result.success) toast.success("Business profile saved")
    else toast.error("Failed to save")
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label>Service Type</Label>
        <Select
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory((v as ContractorCategory) ?? "")}
          items={contractorCategoryLabel}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {contractorCategoryLabel[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Company Name</Label>
        <Input name="company" defaultValue={company ?? ""} placeholder="e.g. Marcello Plumbing & HVAC" />
      </div>
      <div className="space-y-1">
        <Label>Phone</Label>
        <Input name="phone" defaultValue={phone ?? ""} placeholder="555-000-0000" />
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="outline" size="sm" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  )
}
