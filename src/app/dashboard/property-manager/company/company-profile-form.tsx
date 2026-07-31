"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createOrUpdateCompanyProfile } from "@/app/actions/pm"
import { PMEntityType } from "@/generated/prisma"

interface Existing {
  entityType: PMEntityType
  legalName: string
  registrationId: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

export function CompanyProfileForm({ existing }: { existing: Existing | null }) {
  const [saving, setSaving] = useState(false)
  const [entityType, setEntityType] = useState<PMEntityType>(existing?.entityType ?? "COMPANY")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const get = (name: string) => (form.get(name) as string) || undefined
    const result = await createOrUpdateCompanyProfile({
      entityType,
      legalName: form.get("legalName") as string,
      registrationId: get("registrationId"),
      email: get("email"),
      phone: get("phone"),
      addressLine1: get("addressLine1"),
      addressLine2: get("addressLine2"),
      city: get("city"),
      state: get("state"),
      postalCode: get("postalCode"),
      country: get("country"),
      primaryContactName: get("primaryContactName"),
      primaryContactEmail: get("primaryContactEmail"),
      primaryContactPhone: get("primaryContactPhone"),
    })
    setSaving(false)
    if (result.success) {
      toast.success("Company profile saved")
    } else {
      toast.error("Failed to save profile")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Legal Identity</p>
        <div className="space-y-1">
          <Label>Entity Type</Label>
          <Select
            value={entityType}
            onValueChange={(v) => setEntityType((v as PMEntityType) ?? "COMPANY")}
            items={{ COMPANY: "Company", INDIVIDUAL: "Individual" }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPANY">Company</SelectItem>
              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{entityType === "INDIVIDUAL" ? "Full Legal Name" : "Legal Name"}</Label>
          <Input
            name="legalName"
            defaultValue={existing?.legalName}
            placeholder={entityType === "INDIVIDUAL" ? "e.g. Jane Doe" : "e.g. Sunrise Property Management LLC"}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Registration / Tax ID</Label>
          <Input name="registrationId" defaultValue={existing?.registrationId} placeholder="Business registration or tax ID number" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Company Contact</p>
        <div className="space-y-1">
          <Label>General Email</Label>
          <Input name="email" type="email" defaultValue={existing?.email} />
        </div>
        <div className="space-y-1">
          <Label>General Phone</Label>
          <Input name="phone" defaultValue={existing?.phone} />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Address</p>
        <div className="space-y-1">
          <Label>Address Line 1</Label>
          <Input name="addressLine1" defaultValue={existing?.addressLine1} />
        </div>
        <div className="space-y-1">
          <Label>Address Line 2</Label>
          <Input name="addressLine2" defaultValue={existing?.addressLine2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>City</Label>
            <Input name="city" defaultValue={existing?.city} />
          </div>
          <div className="space-y-1">
            <Label>State / Province</Label>
            <Input name="state" defaultValue={existing?.state} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Postal Code</Label>
            <Input name="postalCode" defaultValue={existing?.postalCode} />
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input name="country" defaultValue={existing?.country} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Primary Contact</p>
        <p className="text-xs text-gray-400">The specific person an HOA should reach, not just a general inbox.</p>
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="primaryContactName" defaultValue={existing?.primaryContactName} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input name="primaryContactEmail" type="email" defaultValue={existing?.primaryContactEmail} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input name="primaryContactPhone" defaultValue={existing?.primaryContactPhone} />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving..." : existing ? "Save Changes" : "Create Company Profile"}
      </Button>
    </form>
  )
}
